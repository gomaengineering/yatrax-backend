// controllers/native/nativeGuideController.js
import Guide from "../../models/guideModel.js";
import { handleError, ErrorCodes } from "../../utils/nativeErrors.js";

/**
 * Get all guides with pagination and filtering
 * GET /api/native/guides
 */
export const getAllGuides = async (req, res) => {
  try {
    // Extract query parameters
    const {
      page = 1,
      limit = 20,
      trekAreas,
      minExperience,
      maxRatePerDay,
      languages,
      search,
      sort = "createdAt",
    } = req.query;

    // Validate and parse pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};

    // Filter by trek areas
    if (trekAreas) {
      const areas = Array.isArray(trekAreas) ? trekAreas : trekAreas.split(",").map((a) => a.trim());
      query.trekAreas = { $in: areas };
    }

    // Filter by minimum experience
    if (minExperience) {
      const minExp = parseInt(minExperience, 10);
      if (!isNaN(minExp)) {
        query.experience = { $gte: minExp };
      }
    }

    // Filter by maximum rate per day
    if (maxRatePerDay) {
      const maxRate = parseFloat(maxRatePerDay);
      if (!isNaN(maxRate)) {
        query.ratePerDay = { $lte: maxRate };
      }
    }

    // Filter by languages
    if (languages) {
      const langList = Array.isArray(languages) ? languages : languages.split(",").map((l) => l.trim());
      query.languages = { $in: langList };
    }

    // Search in name, description, and education
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { description: searchRegex },
        { education: searchRegex },
      ];
    }

    // Build sort object
    let sortObj = { createdAt: -1 }; // Default: newest first
    if (sort === "experience") {
      sortObj = { experience: -1 }; // Most experienced first
    } else if (sort === "ratePerDay") {
      sortObj = { ratePerDay: 1 }; // Lowest rate first
    } else if (sort === "name") {
      sortObj = { firstName: 1, lastName: 1 }; // Alphabetical
    }

    // Execute query with pagination (match web: full guide docs, contact only when authenticated)
    const [guides, total] = await Promise.all([
      Guide.find(query)
        .select("-password")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Guide.countDocuments(query),
    ]);

    // Same response shape as web: full guide objects, strip contact if not authenticated
    const transformedGuides = guides.map((guide) => {
      const obj = { ...guide };
      if (!req.user) {
        delete obj.email;
        delete obj.phone;
        delete obj.whatsapp;
      }
      return obj;
    });

    const pages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      count: guides.length,
      total,
      page: pageNum,
      pages,
      guides: transformedGuides,
    });
  } catch (error) {
    console.error("Get all guides error:", error);
    return handleError(res, error);
  }
};

/**
 * Get guide by ID (detailed view)
 * GET /api/native/guides/:id
 */
export const getGuideById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid guide ID format",
        error: {
          code: ErrorCodes.INVALID_FIELD_VALUE,
          type: "validation_error",
        },
      });
    }

    // Find guide (match web: full document, contact only when authenticated)
    const guide = await Guide.findById(id)
      .select("-password")
      .lean();

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
        error: {
          code: ErrorCodes.RESOURCE_NOT_FOUND,
          type: "resource_error",
        },
      });
    }

    const guideObj = { ...guide };
    if (!req.user) {
      delete guideObj.email;
      delete guideObj.phone;
      delete guideObj.whatsapp;
    }

    res.status(200).json({
      success: true,
      guide: guideObj,
    });
  } catch (error) {
    console.error("Get guide by ID error:", error);
    return handleError(res, error);
  }
};

/**
 * Create a new guide
 * POST /api/native/guides
 */
export const createGuide = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      description,
      TBNumber,
      trekAreas,
      experience,
      education,
      languages,
      ratePerDay,
      certifications,
      role,
    } = req.body;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !description ||
      !TBNumber ||
      !trekAreas ||
      experience === undefined ||
      !education ||
      !languages ||
      ratePerDay === undefined ||
      !certifications
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required: firstName, lastName, email, password, description, TBNumber, trekAreas, experience, education, languages, ratePerDay, certifications",
        error: {
          code: ErrorCodes.MISSING_REQUIRED_FIELD,
          type: "validation_error",
        },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
        error: {
          code: ErrorCodes.INVALID_EMAIL_FORMAT,
          type: "validation_error",
        },
      });
    }

    // Validate arrays
    if (!Array.isArray(trekAreas) || trekAreas.length === 0) {
      return res.status(400).json({
        success: false,
        message: "trekAreas must be a non-empty array",
        error: {
          code: ErrorCodes.INVALID_FIELD_VALUE,
          type: "validation_error",
        },
      });
    }

    if (!Array.isArray(languages) || languages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "languages must be a non-empty array",
        error: {
          code: ErrorCodes.INVALID_FIELD_VALUE,
          type: "validation_error",
        },
      });
    }

    if (!Array.isArray(certifications) || certifications.length === 0) {
      return res.status(400).json({
        success: false,
        message: "certifications must be a non-empty array",
        error: {
          code: ErrorCodes.INVALID_FIELD_VALUE,
          type: "validation_error",
        },
      });
    }

    // Validate numeric fields
    if (typeof experience !== "number" || experience < 0) {
      return res.status(400).json({
        success: false,
        message: "experience must be a non-negative number",
        error: {
          code: ErrorCodes.INVALID_FIELD_VALUE,
          type: "validation_error",
        },
      });
    }

    if (typeof ratePerDay !== "number" || ratePerDay < 0) {
      return res.status(400).json({
        success: false,
        message: "ratePerDay must be a non-negative number",
        error: {
          code: ErrorCodes.INVALID_FIELD_VALUE,
          type: "validation_error",
        },
      });
    }

    // Check if guide already exists
    const existingGuide = await Guide.findOne({ email: email.toLowerCase() });
    if (existingGuide) {
      return res.status(409).json({
        success: false,
        message: "Email already in use",
        error: {
          code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
          type: "resource_error",
        },
      });
    }

    // Check if TBNumber already exists
    const existingTBNumber = await Guide.findOne({ TBNumber });
    if (existingTBNumber) {
      return res.status(409).json({
        success: false,
        message: "TBNumber already in use",
        error: {
          code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
          type: "resource_error",
        },
      });
    }

    // Create guide
    const newGuide = await Guide.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      description,
      TBNumber,
      trekAreas,
      experience,
      education,
      languages,
      ratePerDay,
      certifications,
      role: role || "guide",
    });

    // Transform guide for response (exclude sensitive fields)
    const transformedGuide = {
      id: newGuide._id.toString(),
      firstName: newGuide.firstName,
      lastName: newGuide.lastName,
      name: `${newGuide.firstName} ${newGuide.lastName}`,
      description: newGuide.description,
      TBNumber: newGuide.TBNumber,
      trekAreas: newGuide.trekAreas || [],
      experience: newGuide.experience,
      education: newGuide.education,
      languages: newGuide.languages || [],
      ratePerDay: newGuide.ratePerDay,
      certifications: newGuide.certifications || [],
      createdAt: newGuide.createdAt,
      updatedAt: newGuide.updatedAt,
    };

    res.status(201).json({
      success: true,
      message: "Guide created successfully",
      data: transformedGuide,
    });
  } catch (error) {
    console.error("Create guide error:", error);
    return handleError(res, error);
  }
};

/**
 * Update guide by ID
 * PUT /api/native/guides/:id
 */
export const updateGuide = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      password,
      description,
      TBNumber,
      trekAreas,
      experience,
      education,
      languages,
      ratePerDay,
      certifications,
      role,
    } = req.body;

    // Validate ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid guide ID format",
        error: {
          code: ErrorCodes.INVALID_FIELD_VALUE,
          type: "validation_error",
        },
      });
    }

    // Check if guide exists
    const guide = await Guide.findById(id);
    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
        error: {
          code: ErrorCodes.RESOURCE_NOT_FOUND,
          type: "resource_error",
        },
      });
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
          error: {
            code: ErrorCodes.INVALID_EMAIL_FORMAT,
            type: "validation_error",
          },
        });
      }

      // Check if email is already taken by another guide
      const existingGuide = await Guide.findOne({
        email: email.toLowerCase(),
        _id: { $ne: id },
      });
      if (existingGuide) {
        return res.status(409).json({
          success: false,
          message: "Email already in use",
          error: {
            code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
            type: "resource_error",
          },
        });
      }
    }

    // Validate TBNumber if provided
    if (TBNumber) {
      const existingTBNumber = await Guide.findOne({
        TBNumber,
        _id: { $ne: id },
      });
      if (existingTBNumber) {
        return res.status(409).json({
          success: false,
          message: "TBNumber already in use",
          error: {
            code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
            type: "resource_error",
          },
        });
      }
    }

    // Validate arrays if provided
    if (trekAreas !== undefined) {
      if (!Array.isArray(trekAreas) || trekAreas.length === 0) {
        return res.status(400).json({
          success: false,
          message: "trekAreas must be a non-empty array",
          error: {
            code: ErrorCodes.INVALID_FIELD_VALUE,
            type: "validation_error",
          },
        });
      }
    }

    if (languages !== undefined) {
      if (!Array.isArray(languages) || languages.length === 0) {
        return res.status(400).json({
          success: false,
          message: "languages must be a non-empty array",
          error: {
            code: ErrorCodes.INVALID_FIELD_VALUE,
            type: "validation_error",
          },
        });
      }
    }

    if (certifications !== undefined) {
      if (!Array.isArray(certifications) || certifications.length === 0) {
        return res.status(400).json({
          success: false,
          message: "certifications must be a non-empty array",
          error: {
            code: ErrorCodes.INVALID_FIELD_VALUE,
            type: "validation_error",
          },
        });
      }
    }

    // Validate numeric fields if provided
    if (experience !== undefined) {
      if (typeof experience !== "number" || experience < 0) {
        return res.status(400).json({
          success: false,
          message: "experience must be a non-negative number",
          error: {
            code: ErrorCodes.INVALID_FIELD_VALUE,
            type: "validation_error",
          },
        });
      }
    }

    if (ratePerDay !== undefined) {
      if (typeof ratePerDay !== "number" || ratePerDay < 0) {
        return res.status(400).json({
          success: false,
          message: "ratePerDay must be a non-negative number",
          error: {
            code: ErrorCodes.INVALID_FIELD_VALUE,
            type: "validation_error",
          },
        });
      }
    }

    // Build update data
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email.toLowerCase();
    if (password) updateData.password = password; // Will be hashed by pre-save hook
    if (description) updateData.description = description;
    if (TBNumber) updateData.TBNumber = TBNumber;
    if (trekAreas) updateData.trekAreas = trekAreas;
    if (experience !== undefined) updateData.experience = experience;
    if (education) updateData.education = education;
    if (languages) updateData.languages = languages;
    if (ratePerDay !== undefined) updateData.ratePerDay = ratePerDay;
    if (certifications) updateData.certifications = certifications;
    if (role) updateData.role = role;

    const updatedGuide = await Guide.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .select("-password -email -TBNumber -role -__v")
      .lean();

    if (!updatedGuide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
        error: {
          code: ErrorCodes.RESOURCE_NOT_FOUND,
          type: "resource_error",
        },
      });
    }

    // Transform guide for response
    const transformedGuide = {
      id: updatedGuide._id.toString(),
      firstName: updatedGuide.firstName,
      lastName: updatedGuide.lastName,
      name: `${updatedGuide.firstName} ${updatedGuide.lastName}`,
      description: updatedGuide.description,
      trekAreas: updatedGuide.trekAreas || [],
      experience: updatedGuide.experience,
      education: updatedGuide.education,
      languages: updatedGuide.languages || [],
      ratePerDay: updatedGuide.ratePerDay,
      certifications: updatedGuide.certifications || [],
      createdAt: updatedGuide.createdAt,
      updatedAt: updatedGuide.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: "Guide updated successfully",
      data: transformedGuide,
    });
  } catch (error) {
    console.error("Update guide error:", error);
    return handleError(res, error);
  }
};

/**
 * Delete guide by ID
 * DELETE /api/native/guides/:id
 */
export const deleteGuide = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid guide ID format",
        error: {
          code: ErrorCodes.INVALID_FIELD_VALUE,
          type: "validation_error",
        },
      });
    }

    const guide = await Guide.findByIdAndDelete(id);

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
        error: {
          code: ErrorCodes.RESOURCE_NOT_FOUND,
          type: "resource_error",
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Guide deleted successfully",
    });
  } catch (error) {
    console.error("Delete guide error:", error);
    return handleError(res, error);
  }
};

