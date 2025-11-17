// controllers/featuredTrailController.js
import FeaturedTrail from "../models/featuredTrailModel.js";
import TrailInfo from "../models/trailInfoModel.js";

// GET ALL FEATURED TRAILS
export const getAllFeaturedTrails = async (req, res) => {
  try {
    const featuredTrails = await FeaturedTrail.find()
      .populate('trailInfoId', 'image name description')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: featuredTrails.length,
      featuredTrails,
    });
  } catch (error) {
    console.error("Get all featured trails error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// GET FEATURED TRAIL BY ID
export const getFeaturedTrailById = async (req, res) => {
  try {
    const { id } = req.params;

    const featuredTrail = await FeaturedTrail.findById(id)
      .populate('trailInfoId', 'image name description');

    if (!featuredTrail) {
      return res.status(404).json({
        success: false,
        message: "Featured trail not found",
      });
    }

    res.status(200).json({
      success: true,
      featuredTrail,
    });
  } catch (error) {
    console.error("Get featured trail by ID error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid featured trail ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// CREATE FEATURED TRAIL
export const createFeaturedTrail = async (req, res) => {
  try {
    // Check if request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Request body is missing or invalid.",
      });
    }

    const { name, location, time, activityType, difficulty, trailInfoId } = req.body;

    // Validate required fields
    if (!name || !location || !time || !activityType || !difficulty || !trailInfoId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: name, location, time, activityType, difficulty, trailInfoId",
      });
    }

    // Validate activityType enum
    const validActivityTypes = ["Hike", "Trekking", "City Tour"];
    if (!validActivityTypes.includes(activityType)) {
      return res.status(400).json({
        success: false,
        message: `activityType must be one of: ${validActivityTypes.join(", ")}`,
      });
    }

    // Validate difficulty enum
    const validDifficulties = ["Easy", "Moderate", "Hard", "Extreme"];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: `difficulty must be one of: ${validDifficulties.join(", ")}`,
      });
    }

    // Validate that the referenced TrailInfo exists
    const trailInfo = await TrailInfo.findById(trailInfoId);
    if (!trailInfo) {
      return res.status(404).json({
        success: false,
        message: "Referenced trail info not found",
      });
    }

    // Create featured trail
    const newFeaturedTrail = await FeaturedTrail.create({
      name,
      location,
      time,
      activityType,
      difficulty,
      trailInfoId,
    });

    res.status(201).json({
      success: true,
      message: "Featured trail created successfully",
      featuredTrail: newFeaturedTrail,
    });
  } catch (error) {
    console.error("Create featured trail error:", error);
    
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

// UPDATE FEATURED TRAIL
export const updateFeaturedTrail = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, time, activityType, difficulty, trailInfoId } = req.body;

    // Check if featured trail exists
    const featuredTrail = await FeaturedTrail.findById(id);
    if (!featuredTrail) {
      return res.status(404).json({
        success: false,
        message: "Featured trail not found",
      });
    }

    // Validate activityType if provided
    if (activityType) {
      const validActivityTypes = ["Hike", "Trekking", "City Tour"];
      if (!validActivityTypes.includes(activityType)) {
        return res.status(400).json({
          success: false,
          message: `activityType must be one of: ${validActivityTypes.join(", ")}`,
        });
      }
    }

    // Validate difficulty if provided
    if (difficulty) {
      const validDifficulties = ["Easy", "Moderate", "Hard", "Extreme"];
      if (!validDifficulties.includes(difficulty)) {
        return res.status(400).json({
          success: false,
          message: `difficulty must be one of: ${validDifficulties.join(", ")}`,
        });
      }
    }

    // Validate trailInfoId if provided
    if (trailInfoId) {
      const trailInfo = await TrailInfo.findById(trailInfoId);
      if (!trailInfo) {
        return res.status(404).json({
          success: false,
          message: "Referenced trail info not found",
        });
      }
    }

    // Build update data
    const updateData = {};
    if (name) updateData.name = name;
    if (location) updateData.location = location;
    if (time) updateData.time = time;
    if (activityType) updateData.activityType = activityType;
    if (difficulty) updateData.difficulty = difficulty;
    if (trailInfoId) updateData.trailInfoId = trailInfoId;

    const updatedFeaturedTrail = await FeaturedTrail.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Featured trail updated successfully",
      featuredTrail: updatedFeaturedTrail,
    });
  } catch (error) {
    console.error("Update featured trail error:", error);
    
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
        message: "Invalid featured trail ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// DELETE FEATURED TRAIL
export const deleteFeaturedTrail = async (req, res) => {
  try {
    const { id } = req.params;

    const featuredTrail = await FeaturedTrail.findById(id);
    if (!featuredTrail) {
      return res.status(404).json({
        success: false,
        message: "Featured trail not found",
      });
    }

    await FeaturedTrail.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Featured trail deleted successfully",
    });
  } catch (error) {
    console.error("Delete featured trail error:", error);
    
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid featured trail ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

