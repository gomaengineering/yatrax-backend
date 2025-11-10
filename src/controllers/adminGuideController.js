// controllers/adminGuideController.js
import Guide from "../models/guideModel.js";

// GET ALL GUIDES (with pagination and filters)
export const getAllGuides = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { TBNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const guides = await Guide.find(query)
      .select("-password")
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Guide.countDocuments(query);

    res.status(200).json({
      success: true,
      count: guides.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
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

// GET GUIDE BY ID
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

// UPDATE GUIDE
export const updateGuide = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
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
      const existingGuide = await Guide.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
      if (existingGuide) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    // Update guide
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email.toLowerCase();
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
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// DELETE GUIDE
export const deleteGuide = async (req, res) => {
  try {
    const { id } = req.params;

    const guide = await Guide.findById(id);
    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
      });
    }

    // Prevent deleting admin guides (optional safety check)
    if (guide.role === "admin" && req.userId === id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own admin account",
      });
    }

    await Guide.findByIdAndDelete(id);

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

// CREATE GUIDE (Admin can create guides)
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
      !experience ||
      !education ||
      !languages ||
      !ratePerDay ||
      !certifications
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required: firstName, lastName, email, password, description, TBNumber, trekAreas, experience, education, languages, ratePerDay, certifications",
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

    // Validate arrays
    if (!Array.isArray(trekAreas) || trekAreas.length === 0) {
      return res.status(400).json({
        success: false,
        message: "trekAreas must be a non-empty array",
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

    res.status(201).json({
      success: true,
      message: "Guide created successfully",
      guide: {
        id: newGuide._id,
        firstName: newGuide.firstName,
        lastName: newGuide.lastName,
        email: newGuide.email,
        role: newGuide.role,
        description: newGuide.description,
        TBNumber: newGuide.TBNumber,
        trekAreas: newGuide.trekAreas,
        experience: newGuide.experience,
        education: newGuide.education,
        languages: newGuide.languages,
        ratePerDay: newGuide.ratePerDay,
        certifications: newGuide.certifications,
      },
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
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

