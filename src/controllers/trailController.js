// controllers/trailController.js
import Trail from "../models/trailModel.js";

// 🗺️ CREATE TRAIL (Save GeoJSON)
export const createTrail = async (req, res) => {
  try {
    const { name, description, type, geometry, properties, difficulty, length, elevation, guideId, isActive } = req.body;

    // Validate required fields
    if (!name || !geometry) {
      return res.status(400).json({
        success: false,
        message: "Name and geometry are required",
      });
    }

    // Ensure type is "Feature" for valid GeoJSON
    const trailData = {
      name,
      description,
      type: type || "Feature",
      geometry,
      properties: properties || {},
      difficulty,
      length,
      elevation,
      guideId,
      isActive: isActive !== undefined ? isActive : true,
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

// 📍 GET ALL TRAILS
export const getAllTrails = async (req, res) => {
  try {
    const { isActive, guideId, difficulty, limit = 100, page = 1 } = req.query;

    // Build query
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (guideId) query.guideId = guideId;
    if (difficulty) query.difficulty = difficulty;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const trails = await Trail.find(query)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 })
      .populate("guideId", "firstName lastName email");

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

// 🔍 GET TRAIL BY ID
export const getTrailById = async (req, res) => {
  try {
    const { id } = req.params;

    const trail = await Trail.findById(id).populate("guideId", "firstName lastName email");

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

// 🔄 UPDATE TRAIL
export const updateTrail = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow changing the _id
    delete updateData._id;

    const trail = await Trail.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!trail) {
      return res.status(404).json({
        success: false,
        message: "Trail not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Trail updated successfully",
      trail,
    });
  } catch (error) {
    console.error("Update trail error:", error);
    
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid trail ID",
      });
    }

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

// 🗑️ DELETE TRAIL
export const deleteTrail = async (req, res) => {
  try {
    const { id } = req.params;

    const trail = await Trail.findByIdAndDelete(id);

    if (!trail) {
      return res.status(404).json({
        success: false,
        message: "Trail not found",
      });
    }

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

// 📍 FIND TRAILS NEAR A POINT (Using $near)
export const findTrailsNear = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10000, minDistance = 0, limit = 50 } = req.query;

    // Validate coordinates
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lng) || isNaN(lat)) {
      return res.status(400).json({
        success: false,
        message: "Valid longitude and latitude are required",
      });
    }

    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates. Longitude must be -180 to 180, Latitude must be -90 to 90",
      });
    }

    const trails = await Trail.find({
      geometry: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: parseFloat(maxDistance), // in meters
          $minDistance: parseFloat(minDistance), // in meters
        },
      },
      isActive: true,
    })
      .limit(parseInt(limit))
      .populate("guideId", "firstName lastName email");

    res.status(200).json({
      success: true,
      count: trails.length,
      trails,
    });
  } catch (error) {
    console.error("Find trails near error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 🗺️ FIND TRAILS WITHIN A POLYGON (Using $geoWithin)
export const findTrailsWithin = async (req, res) => {
  try {
    const { polygon } = req.body;

    if (!polygon || !polygon.type || !polygon.coordinates) {
      return res.status(400).json({
        success: false,
        message: "Valid GeoJSON polygon is required in request body",
      });
    }

    if (polygon.type !== "Polygon") {
      return res.status(400).json({
        success: false,
        message: "Polygon type must be 'Polygon'",
      });
    }

    const trails = await Trail.find({
      geometry: {
        $geoWithin: {
          $geometry: polygon,
        },
      },
      isActive: true,
    }).populate("guideId", "firstName lastName email");

    res.status(200).json({
      success: true,
      count: trails.length,
      trails,
    });
  } catch (error) {
    console.error("Find trails within error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 📏 FIND TRAILS WITHIN A CIRCLE (Using $geoWithin with $centerSphere)
export const findTrailsWithinRadius = async (req, res) => {
  try {
    const { longitude, latitude, radius = 10, limit = 50 } = req.query;

    // Validate coordinates
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    const rad = parseFloat(radius);

    if (isNaN(lng) || isNaN(lat) || isNaN(rad)) {
      return res.status(400).json({
        success: false,
        message: "Valid longitude, latitude, and radius are required",
      });
    }

    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates",
      });
    }

    // Convert radius from kilometers to radians (Earth's radius ≈ 6371 km)
    const radiusInRadians = rad / 6371;

    const trails = await Trail.find({
      geometry: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusInRadians],
        },
      },
      isActive: true,
    })
      .limit(parseInt(limit))
      .populate("guideId", "firstName lastName email");

    res.status(200).json({
      success: true,
      count: trails.length,
      trails,
    });
  } catch (error) {
    console.error("Find trails within radius error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 🔍 FIND TRAILS INTERSECTING WITH A GEOMETRY (Using $geoIntersects)
export const findTrailsIntersecting = async (req, res) => {
  try {
    const { geometry } = req.body;

    if (!geometry || !geometry.type || !geometry.coordinates) {
      return res.status(400).json({
        success: false,
        message: "Valid GeoJSON geometry is required in request body",
      });
    }

    const trails = await Trail.find({
      geometry: {
        $geoIntersects: {
          $geometry: geometry,
        },
      },
      isActive: true,
    }).populate("guideId", "firstName lastName email");

    res.status(200).json({
      success: true,
      count: trails.length,
      trails,
    });
  } catch (error) {
    console.error("Find trails intersecting error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};