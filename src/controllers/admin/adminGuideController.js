// controllers/admin/adminGuideController.js
import Guide from "../../models/guideModel.js";
import Trail from "../../models/trailModel.js";

// GET ALL GUIDES
export const getAllGuides = async (req, res) => {
  try {
    const guides = await Guide.find()
      .select("-password");

    // trekAreas already contains _id and name in the database
    const transformedGuides = guides.map(guide => guide.toObject());

    res.status(200).json({
      success: true,
      count: guides.length,
      guides: transformedGuides,
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

    const guide = await Guide.findById(id)
      .select("-password");

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
      });
    }

    // trekAreas already contains _id and name in the database
    const guideObj = guide.toObject();

    res.status(200).json({
      success: true,
      guide: guideObj,
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
    if (experience !== undefined) updateData.experience = experience;
    if (education) updateData.education = education;
    if (languages) updateData.languages = languages;
    if (ratePerDay !== undefined) updateData.ratePerDay = ratePerDay;
    if (certifications) updateData.certifications = certifications;
    if (role) updateData.role = role;

    // Handle trekAreas update separately to sync relationships
    if (trekAreas !== undefined) {
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

      // Get old trail IDs for cleanup
      const oldTrailIds = guide.trekAreas
        ? guide.trekAreas.map((t) => t._id || t).filter(Boolean)
        : [];

      // Remove guide from old trails
      if (oldTrailIds.length > 0) {
        await Trail.updateMany(
          { _id: { $in: oldTrailIds } },
          { $pull: { guides: id } }
        );
      }

      // Prepare new trails data with names
      const trailsData = validTrails.map((trail) => ({
        _id: trail._id,
        name: trail.properties?.name || "Unnamed Trail",
      }));

      // Set new trails with names
      updateData.trekAreas = trailsData;

      // Add guide to new trails
      if (trekAreas.length > 0) {
        await Trail.updateMany(
          { _id: { $in: trekAreas } },
          { $addToSet: { guides: id } }
        );
      }
    }

    const updatedGuide = await Guide.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .select("-password");

    // trekAreas already contains _id and name in the database
    const guideObj = updatedGuide.toObject();

    res.status(200).json({
      success: true,
      message: "Guide updated successfully",
      guide: guideObj,
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

    // Get trail IDs from embedded documents
    const trailIds = guide.trekAreas
      ? guide.trekAreas.map((t) => t._id || t).filter(Boolean)
      : [];

    // Remove guide from all trails
    if (trailIds.length > 0) {
      await Trail.updateMany(
        { _id: { $in: trailIds } },
        { $pull: { guides: id } }
      );
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
    // Check if request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Request body is missing or invalid. Please ensure Content-Type is 'application/json' and the request body is properly formatted.",
      });
    }

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

    // Fetch the guide (trekAreas already contains _id and name)
    const guideWithTrails = await Guide.findById(newGuide._id)
      .select("-password");

    // trekAreas already contains _id and name in the database
    const guideObj = guideWithTrails.toObject();

    res.status(201).json({
      success: true,
      message: "Guide created successfully",
      guide: guideObj,
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

// 🔗 ASSIGN TRAIL TO GUIDE (Admin Only)
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

// 🔗 REMOVE TRAIL FROM GUIDE (Admin Only)
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

// 📋 GET ALL TRAILS FOR A GUIDE (Admin Only)
export const getGuideTrails = async (req, res) => {
  try {
    const { id } = req.params;

    const guide = await Guide.findById(id)
      .select("-password");

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
      });
    }

    // trekAreas already contains _id and name in the database
    const trails = guide.trekAreas || [];

    res.status(200).json({
      success: true,
      guide: {
        _id: guide._id,
        firstName: guide.firstName,
        lastName: guide.lastName,
        email: guide.email,
      },
      trails: trails,
      count: trails.length,
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

