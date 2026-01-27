// controllers/web/trailController.js
import Trail from "../../models/trailModel.js";
import Guide from "../../models/guideModel.js";

// 🗺️ CREATE TRAIL (Save GeoJSON Feature)
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

// 🗺️ CREATE TRAILS FROM FEATURECOLLECTION (Import GeoJSON FeatureCollection)
export const createTrailsFromFeatureCollection = async (req, res) => {
  try {
    const { type, features, name, crs } = req.body;

    // Validate FeatureCollection structure
    if (type !== "FeatureCollection") {
      return res.status(400).json({
        success: false,
        message: "Type must be 'FeatureCollection'",
      });
    }

    if (!Array.isArray(features) || features.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Features array is required and must not be empty",
      });
    }

    // Create FeatureCollection object
    const featureCollection = {
      type: "FeatureCollection",
      features,
      ...(name && { name }),
      ...(crs && { crs }),
    };

    // Convert FeatureCollection to Trail documents
    const trailDocuments = Trail.fromGeoJSONFeatureCollection(featureCollection);

    // Save all trails
    const savedTrails = await Trail.insertMany(trailDocuments, { ordered: false });

    res.status(201).json({
      success: true,
      message: `${savedTrails.length} trail(s) created successfully from FeatureCollection`,
      count: savedTrails.length,
      trails: savedTrails,
    });
  } catch (error) {
    console.error("Create trails from FeatureCollection error:", error);
    
    // Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message,
      });
    }

    // Handle bulk write errors
    if (error.name === "BulkWriteError") {
      return res.status(400).json({
        success: false,
        message: "Some trails failed validation",
        error: error.message,
        insertedCount: error.result?.insertedCount || 0,
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
    const { fid, id, name, difficulty, limit = 100, page = 1 } = req.query;

    // Build query based on properties
    const query = {};
    if (fid) query["properties.fid"] = parseInt(fid);
    if (id) query["properties.id"] = parseInt(id);
    if (name) query["properties.name"] = { $regex: name, $options: "i" }; // Case-insensitive search
    if (difficulty) query["properties.difficulty"] = parseInt(difficulty);

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    const trails = await Trail.find(query)
      .limit(limitNum)
      .skip(skip)
      .sort({ createdAt: -1 })
      .lean();

    // Populate TrailInfo for all trails
    await Trail.populateTrailInfo(trails);

    const total = await Trail.countDocuments(query);

    // Transform trails to match app API response format
    const transformedTrails = trails.map((trail) => {
      const trailInfo = trail.trailInfo || null;
      const hasTrailInfoFlag = !!trailInfo;

      return {
        type: trail.type,
        id: trail._id.toString(),
        properties: {
          name: trailInfo?.name || trail.properties?.name || "Unnamed Trail",
          difficulty: trail.properties?.difficulty || null,
          activityType: trailInfo?.activityType || null,
          region: trailInfo?.region || null,
          country: trailInfo?.country || null,
          duration_days: trailInfo?.duration_days || null,
          total_distance_km: trailInfo?.total_distance_km || null,
          rating_avg: trailInfo?.user_content?.rating_avg || null,
          rating_count: trailInfo?.user_content?.rating_count || null,
          image: trailInfo?.image || null,
          hasTrailInfo: hasTrailInfoFlag,
        },
        geometry: trail.geometry, // Full geometry coordinates
      };
    });

    res.status(200).json({
      success: true,
      data: {
        trails: transformedTrails,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: trails.length,
          pages: Math.ceil(total / limitNum) || 1,
        },
      },
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

    const trail = await Trail.findById(id);

    if (!trail) {
      return res.status(404).json({
        success: false,
        message: "Trail not found",
      });
    }

    // Populate TrailInfo if trailInfoId exists
    await trail.populateTrailInfo();

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
    const { type, geometry, properties } = req.body;

    // Build update data - only allow type, geometry, and properties
    const updateData = {};
    if (type) updateData.type = type;
    if (geometry) updateData.geometry = geometry;
    if (properties) updateData.properties = properties;

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
    })
      .limit(parseInt(limit));

    // Populate TrailInfo for all trails
    await Trail.populateTrailInfo(trails);

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
    });

    // Populate TrailInfo for all trails
    await Trail.populateTrailInfo(trails);

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
    })
      .limit(parseInt(limit));

    // Populate TrailInfo for all trails
    await Trail.populateTrailInfo(trails);

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
    });

    // Populate TrailInfo for all trails
    await Trail.populateTrailInfo(trails);

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

// 📋 GET ALL GUIDES FOR A TRAIL
export const getTrailGuides = async (req, res) => {
  try {
    const { id } = req.params;

    const trail = await Trail.findById(id).populate("guides");

    if (!trail) {
      return res.status(404).json({
        success: false,
        message: "Trail not found",
      });
    }

    res.status(200).json({
      success: true,
      trail: {
        _id: trail._id,
        type: trail.type,
        properties: trail.properties,
      },
      guides: trail.guides || [],
      count: trail.guides ? trail.guides.length : 0,
    });
  } catch (error) {
    console.error("Get trail guides error:", error);

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

