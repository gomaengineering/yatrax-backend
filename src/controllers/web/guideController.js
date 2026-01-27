// controllers/web/guideController.js
import Guide from "../../models/guideModel.js";
import Trail from "../../models/trailModel.js";

// 👤 CREATE GUIDE
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
          "All fields are required: firstName, lastName, email, password, description, TBNumber, trekAreas (array of trail IDs), experience, education, languages, ratePerDay, certifications",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Validate trekAreas (should be array of trail IDs)
    if (!Array.isArray(trekAreas) || trekAreas.length === 0) {
      return res.status(400).json({
        success: false,
        message: "trekAreas must be a non-empty array of trail IDs",
      });
    }

    // Validate that all trail IDs exist
    const validTrails = await Trail.find({
      _id: { $in: trekAreas },
    });

    if (validTrails.length !== trekAreas.length) {
      const foundIds = validTrails.map((t) => t._id.toString());
      const invalidIds = trekAreas.filter(
        (id) => !foundIds.includes(id.toString())
      );
      return res.status(400).json({
        success: false,
        message: `Invalid trail IDs: ${invalidIds.join(", ")}`,
      });
    }

    if (!Array.isArray(languages) || languages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "languages must be a non-empty array",
      });
    }

    if (!Array.isArray(certifications) || certifications.length === 0) {
      return res.status(400).json({
        success: false,
        message: "certifications must be a non-empty array",
      });
    }

    // Validate numeric fields
    if (typeof experience !== "number" || experience < 0) {
      return res.status(400).json({
        success: false,
        message: "experience must be a non-negative number",
      });
    }

    if (typeof ratePerDay !== "number" || ratePerDay < 0) {
      return res.status(400).json({
        success: false,
        message: "ratePerDay must be a non-negative number",
      });
    }

    // Check if guide already exists
    const existingGuide = await Guide.findOne({ email: email.toLowerCase() });
    if (existingGuide) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    // Check if TBNumber already exists
    const existingTBNumber = await Guide.findOne({ TBNumber });
    if (existingTBNumber) {
      return res.status(400).json({
        success: false,
        message: "TBNumber already in use",
      });
    }

    // Create guide (without trails first)
    const newGuide = await Guide.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      description,
      TBNumber,
      experience,
      education,
      languages,
      ratePerDay,
      certifications,
      role: role || "guide",
    });

    // Assign trails to guide (syncs both sides)
    if (trekAreas && trekAreas.length > 0) {
      await Guide.assignTrailsToGuide(newGuide._id, trekAreas);
    }

    // Fetch the guide with populated trails
    const guideWithTrails = await Guide.findById(newGuide._id)
      .select("-password")
      .populate("trails");

    // Return guide without password
    const guideResponse = guideWithTrails.toObject();
    delete guideResponse.password;

    res.status(201).json({
      success: true,
      message: "Guide created successfully",
      guide: guideResponse,
    });
  } catch (error) {
    console.error("Create guide error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message,
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 📍 GET ALL GUIDES
export const getAllGuides = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      trekAreas,
      minExperience,
      maxExperience,
      minRatePerDay,
      maxRatePerDay,
      languages,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    // Filter by trek areas
    if (trekAreas) {
      const areas = Array.isArray(trekAreas)
        ? trekAreas
        : trekAreas.split(",").map((a) => a.trim());
      query.trekAreas = { $in: areas };
    }

    // Filter by experience range
    if (minExperience || maxExperience) {
      query.experience = {};
      if (minExperience) {
        query.experience.$gte = parseInt(minExperience);
      }
      if (maxExperience) {
        query.experience.$lte = parseInt(maxExperience);
      }
    }

    // Filter by rate per day range
    if (minRatePerDay || maxRatePerDay) {
      query.ratePerDay = {};
      if (minRatePerDay) {
        query.ratePerDay.$gte = parseFloat(minRatePerDay);
      }
      if (maxRatePerDay) {
        query.ratePerDay.$lte = parseFloat(maxRatePerDay);
      }
    }

    // Filter by languages
    if (languages) {
      const langList = Array.isArray(languages)
        ? languages
        : languages.split(",").map((l) => l.trim());
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
    const sortOptions = {};
    const validSortFields = [
      "createdAt",
      "updatedAt",
      "firstName",
      "lastName",
      "experience",
      "ratePerDay",
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const guides = await Guide.find(query)
      .select("-password")
      .sort(sortOptions)
      .limit(limitNum)
      .skip(skip);

    const total = await Guide.countDocuments(query);

    res.status(200).json({
      success: true,
      count: guides.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limitNum),
      guides,
    });
  } catch (error) {
    console.error("Get all guides error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 🔍 GET GUIDE BY ID
export const getGuideById = async (req, res) => {
  try {
    const { id } = req.params;

    const guide = await Guide.findById(id).select("-password");

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
      });
    }

    res.status(200).json({
      success: true,
      guide,
    });
  } catch (error) {
    console.error("Get guide by ID error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid guide ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 🔄 UPDATE GUIDE
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

    // Check if guide exists
    const guide = await Guide.findById(id);
    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
      });
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        });
      }

      // Check if email is already taken by another guide
      const existingGuide = await Guide.findOne({
        email: email.toLowerCase(),
        _id: { $ne: id },
      });
      if (existingGuide) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
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
        return res.status(400).json({
          success: false,
          message: "TBNumber already in use",
        });
      }
    }

    // Validate arrays if provided
    if (trekAreas !== undefined) {
      if (!Array.isArray(trekAreas) || trekAreas.length === 0) {
        return res.status(400).json({
          success: false,
          message: "trekAreas must be a non-empty array",
        });
      }
    }

    if (languages !== undefined) {
      if (!Array.isArray(languages) || languages.length === 0) {
        return res.status(400).json({
          success: false,
          message: "languages must be a non-empty array",
        });
      }
    }

    if (certifications !== undefined) {
      if (!Array.isArray(certifications) || certifications.length === 0) {
        return res.status(400).json({
          success: false,
          message: "certifications must be a non-empty array",
        });
      }
    }

    // Validate numeric fields if provided
    if (experience !== undefined) {
      if (typeof experience !== "number" || experience < 0) {
        return res.status(400).json({
          success: false,
          message: "experience must be a non-negative number",
        });
      }
    }

    if (ratePerDay !== undefined) {
      if (typeof ratePerDay !== "number" || ratePerDay < 0) {
        return res.status(400).json({
          success: false,
          message: "ratePerDay must be a non-negative number",
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
    }).select("-password");

    res.status(200).json({
      success: true,
      message: "Guide updated successfully",
      guide: updatedGuide,
    });
  } catch (error) {
    console.error("Update guide error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message,
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid guide ID",
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 🗑️ DELETE GUIDE
export const deleteGuide = async (req, res) => {
  try {
    const { id } = req.params;

    const guide = await Guide.findByIdAndDelete(id);

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Guide deleted successfully",
    });
  } catch (error) {
    console.error("Delete guide error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid guide ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 🔗 ASSIGN TRAIL TO GUIDE
export const assignTrailToGuide = async (req, res) => {
  try {
    const { guideId, trailId } = req.params;

    // Validate IDs
    if (!guideId || !trailId) {
      return res.status(400).json({
        success: false,
        message: "Guide ID and Trail ID are required",
      });
    }

    // Check if guide exists
    const guide = await Guide.findById(guideId);
    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
      });
    }

    // Check if trail exists
    const trail = await Trail.findById(trailId);
    if (!trail) {
      return res.status(404).json({
        success: false,
        message: "Trail not found",
      });
    }

    // Assign trail to guide (syncs both sides)
    const updatedGuide = await Guide.assignTrailToGuide(guideId, trailId);

    res.status(200).json({
      success: true,
      message: "Trail assigned to guide successfully",
      guide: updatedGuide,
    });
  } catch (error) {
    console.error("Assign trail to guide error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid guide or trail ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 🔗 REMOVE TRAIL FROM GUIDE
export const removeTrailFromGuide = async (req, res) => {
  try {
    const { guideId, trailId } = req.params;

    // Validate IDs
    if (!guideId || !trailId) {
      return res.status(400).json({
        success: false,
        message: "Guide ID and Trail ID are required",
      });
    }

    // Check if guide exists
    const guide = await Guide.findById(guideId);
    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
      });
    }

    // Remove trail from guide (syncs both sides)
    const updatedGuide = await Guide.removeTrailFromGuide(guideId, trailId);

    res.status(200).json({
      success: true,
      message: "Trail removed from guide successfully",
      guide: updatedGuide,
    });
  } catch (error) {
    console.error("Remove trail from guide error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid guide or trail ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 📋 GET ALL TRAILS FOR A GUIDE
export const getGuideTrails = async (req, res) => {
  try {
    const { id } = req.params;

    const guide = await Guide.findById(id)
      .select("-password")
      .populate("trails");

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
      });
    }

    res.status(200).json({
      success: true,
      guide: {
        _id: guide._id,
        firstName: guide.firstName,
        lastName: guide.lastName,
        email: guide.email,
      },
      trails: guide.trails || [],
      count: guide.trails ? guide.trails.length : 0,
    });
  } catch (error) {
    console.error("Get guide trails error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid guide ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

