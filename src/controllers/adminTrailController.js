// controllers/adminTrailController.js
import Trail from "../models/trailModel.js";

// GET ALL TRAILS (Admin version with more filters)
export const getAllTrails = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      fid,
      id,
      name,
      difficulty,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};
    if (fid) query["properties.fid"] = parseInt(fid);
    if (id) query["properties.id"] = parseInt(id);
    if (name) query["properties.name"] = { $regex: name, $options: "i" };
    if (difficulty) query["properties.difficulty"] = parseInt(difficulty);
    
    if (search) {
      query.$or = [
        { "properties.name": { $regex: search, $options: "i" } },
        { "properties.description": { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const trails = await Trail.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Trail.countDocuments(query);

    res.status(200).json({
      success: true,
      count: trails.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      trails,
    });
  } catch (error) {
    console.error("Get all trails error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// GET TRAIL BY ID
export const getTrailById = async (req, res) => {
  try {
    const { id } = req.params;

    const trail = await Trail.findById(id);

    if (!trail) {
      return res.status(404).json({
        success: false,
        message: "Trail not found",
      });
    }

    res.status(200).json({
      success: true,
      trail,
    });
  } catch (error) {
    console.error("Get trail by ID error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid trail ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// CREATE TRAIL
export const createTrail = async (req, res) => {
  try {
    const { type, geometry, properties } = req.body;

    // Validate required fields
    if (!geometry || !geometry.type || !geometry.coordinates) {
      return res.status(400).json({
        success: false,
        message: "Geometry with type and coordinates are required",
      });
    }

    // Ensure type is "Feature" for valid GeoJSON
    const trailData = {
      type: type || "Feature",
      geometry,
      properties: properties || {},
    };

    // Create trail (validation happens in pre-save hook)
    const newTrail = await Trail.create(trailData);

    res.status(201).json({
      success: true,
      message: "Trail created successfully",
      trail: newTrail,
    });
  } catch (error) {
    console.error("Create trail error:", error);

    // Handle validation errors
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

// UPDATE TRAIL
export const updateTrail = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, geometry, properties } = req.body;

    const trail = await Trail.findById(id);
    if (!trail) {
      return res.status(404).json({
        success: false,
        message: "Trail not found",
      });
    }

    // Update trail data
    const updateData = {};
    if (type) updateData.type = type;
    if (geometry) updateData.geometry = geometry;
    if (properties) updateData.properties = properties;

    const updatedTrail = await Trail.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Trail updated successfully",
      trail: updatedTrail,
    });
  } catch (error) {
    console.error("Update trail error:", error);

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
        message: "Invalid trail ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// DELETE TRAIL
export const deleteTrail = async (req, res) => {
  try {
    const { id } = req.params;

    const trail = await Trail.findById(id);
    if (!trail) {
      return res.status(404).json({
        success: false,
        message: "Trail not found",
      });
    }

    await Trail.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Trail deleted successfully",
    });
  } catch (error) {
    console.error("Delete trail error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid trail ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

