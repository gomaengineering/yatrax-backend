// controllers/trailInfoController.js
import TrailInfo from "../models/trailInfoModel.js";

// GET ALL TRAIL INFO
export const getAllTrailInfo = async (req, res) => {
  try {
    const trailInfoList = await TrailInfo.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: trailInfoList.length,
      trailInfo: trailInfoList,
    });
  } catch (error) {
    console.error("Get all trail info error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// GET TRAIL INFO BY ID
export const getTrailInfoById = async (req, res) => {
  try {
    const { id } = req.params;

    const trailInfo = await TrailInfo.findById(id);

    if (!trailInfo) {
      return res.status(404).json({
        success: false,
        message: "Trail info not found",
      });
    }

    res.status(200).json({
      success: true,
      trailInfo,
    });
  } catch (error) {
    console.error("Get trail info by ID error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid trail info ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// CREATE TRAIL INFO (Insert trail details)
export const createTrailInfo = async (req, res) => {
  try {
    // Check if request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Request body is missing or invalid. Please ensure Content-Type is 'application/json' and the request body is properly formatted.",
      });
    }

    const {
      name,
      region,
      country,
      description,
      difficulty,
      duration_days,
      total_distance_km,
      best_season,
      major_highlights,
      starting_point,
      ending_point,
      altitude_min_m,
      altitude_max_m,
      permit_required,
      environment,
      user_content,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !region ||
      !country ||
      !description ||
      !difficulty ||
      !duration_days ||
      !total_distance_km ||
      !best_season ||
      !major_highlights ||
      !starting_point ||
      !ending_point ||
      altitude_min_m === undefined ||
      altitude_max_m === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All required fields must be provided: name, region, country, description, difficulty, duration_days, total_distance_km, best_season, major_highlights, starting_point, ending_point, altitude_min_m, altitude_max_m",
      });
    }

    // Validate starting_point
    if (!starting_point.name || starting_point.altitude_m === undefined) {
      return res.status(400).json({
        success: false,
        message: "Starting point must have both 'name' and 'altitude_m' fields",
      });
    }

    // Validate ending_point
    if (!ending_point.name || ending_point.altitude_m === undefined) {
      return res.status(400).json({
        success: false,
        message: "Ending point must have both 'name' and 'altitude_m' fields",
      });
    }

    // Validate arrays
    if (!Array.isArray(best_season) || best_season.length === 0) {
      return res.status(400).json({
        success: false,
        message: "best_season must be a non-empty array",
      });
    }

    if (!Array.isArray(major_highlights) || major_highlights.length === 0) {
      return res.status(400).json({
        success: false,
        message: "major_highlights must be a non-empty array",
      });
    }

    // Validate altitude values
    if (altitude_min_m < 0 || altitude_max_m < 0) {
      return res.status(400).json({
        success: false,
        message: "Altitude values must be non-negative numbers",
      });
    }

    if (altitude_min_m > altitude_max_m) {
      return res.status(400).json({
        success: false,
        message: "Minimum altitude cannot be greater than maximum altitude",
      });
    }

    // Validate duration and distance
    if (duration_days < 1) {
      return res.status(400).json({
        success: false,
        message: "Duration must be at least 1 day",
      });
    }

    if (total_distance_km < 0) {
      return res.status(400).json({
        success: false,
        message: "Total distance must be a non-negative number",
      });
    }

    // Prepare trail info data
    const trailInfoData = {
      name,
      region,
      country,
      description,
      difficulty,
      duration_days,
      total_distance_km,
      best_season,
      major_highlights,
      starting_point: {
        name: starting_point.name,
        altitude_m: starting_point.altitude_m,
      },
      ending_point: {
        name: ending_point.name,
        altitude_m: ending_point.altitude_m,
      },
      altitude_min_m,
      altitude_max_m,
      permit_required: permit_required || [],
      environment: {
        wildlife: environment?.wildlife || [],
        local_culture: environment?.local_culture || "",
        climate_conditions: environment?.climate_conditions || "",
        conservation_rules: environment?.conservation_rules || "",
      },
      user_content: {
        rating_avg: user_content?.rating_avg || 0,
        rating_count: user_content?.rating_count || 0,
      },
    };

    // Create trail info
    const newTrailInfo = await TrailInfo.create(trailInfoData);

    res.status(201).json({
      success: true,
      message: "Trail info created successfully",
      trailInfo: newTrailInfo,
    });
  } catch (error) {
    console.error("Create trail info error:", error);
    
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

// UPDATE TRAIL INFO
export const updateTrailInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      region,
      country,
      description,
      difficulty,
      duration_days,
      total_distance_km,
      best_season,
      major_highlights,
      starting_point,
      ending_point,
      altitude_min_m,
      altitude_max_m,
      permit_required,
      environment,
      user_content,
    } = req.body;

    // Check if trail info exists
    const trailInfo = await TrailInfo.findById(id);
    if (!trailInfo) {
      return res.status(404).json({
        success: false,
        message: "Trail info not found",
      });
    }

    // Validate starting_point if provided
    if (starting_point) {
      if (!starting_point.name || starting_point.altitude_m === undefined) {
        return res.status(400).json({
          success: false,
          message: "Starting point must have both 'name' and 'altitude_m' fields",
        });
      }
    }

    // Validate ending_point if provided
    if (ending_point) {
      if (!ending_point.name || ending_point.altitude_m === undefined) {
        return res.status(400).json({
          success: false,
          message: "Ending point must have both 'name' and 'altitude_m' fields",
        });
      }
    }

    // Validate arrays if provided
    if (best_season !== undefined) {
      if (!Array.isArray(best_season) || best_season.length === 0) {
        return res.status(400).json({
          success: false,
          message: "best_season must be a non-empty array",
        });
      }
    }

    if (major_highlights !== undefined) {
      if (!Array.isArray(major_highlights) || major_highlights.length === 0) {
        return res.status(400).json({
          success: false,
          message: "major_highlights must be a non-empty array",
        });
      }
    }

    // Validate altitude values if provided
    if (altitude_min_m !== undefined || altitude_max_m !== undefined) {
      const minAlt = altitude_min_m !== undefined ? altitude_min_m : trailInfo.altitude_min_m;
      const maxAlt = altitude_max_m !== undefined ? altitude_max_m : trailInfo.altitude_max_m;
      
      if (minAlt < 0 || maxAlt < 0) {
        return res.status(400).json({
          success: false,
          message: "Altitude values must be non-negative numbers",
        });
      }

      if (minAlt > maxAlt) {
        return res.status(400).json({
          success: false,
          message: "Minimum altitude cannot be greater than maximum altitude",
        });
      }
    }

    // Validate duration and distance if provided
    if (duration_days !== undefined && duration_days < 1) {
      return res.status(400).json({
        success: false,
        message: "Duration must be at least 1 day",
      });
    }

    if (total_distance_km !== undefined && total_distance_km < 0) {
      return res.status(400).json({
        success: false,
        message: "Total distance must be a non-negative number",
      });
    }

    // Build update data object
    const updateData = {};
    if (name) updateData.name = name;
    if (region) updateData.region = region;
    if (country) updateData.country = country;
    if (description) updateData.description = description;
    if (difficulty) updateData.difficulty = difficulty;
    if (duration_days !== undefined) updateData.duration_days = duration_days;
    if (total_distance_km !== undefined) updateData.total_distance_km = total_distance_km;
    if (best_season) updateData.best_season = best_season;
    if (major_highlights) updateData.major_highlights = major_highlights;
    if (starting_point) {
      updateData.starting_point = {
        name: starting_point.name,
        altitude_m: starting_point.altitude_m,
      };
    }
    if (ending_point) {
      updateData.ending_point = {
        name: ending_point.name,
        altitude_m: ending_point.altitude_m,
      };
    }
    if (altitude_min_m !== undefined) updateData.altitude_min_m = altitude_min_m;
    if (altitude_max_m !== undefined) updateData.altitude_max_m = altitude_max_m;
    if (permit_required !== undefined) updateData.permit_required = permit_required;
    
    if (environment) {
      updateData.environment = {};
      if (environment.wildlife !== undefined) updateData.environment.wildlife = environment.wildlife;
      if (environment.local_culture !== undefined) updateData.environment.local_culture = environment.local_culture;
      if (environment.climate_conditions !== undefined) updateData.environment.climate_conditions = environment.climate_conditions;
      if (environment.conservation_rules !== undefined) updateData.environment.conservation_rules = environment.conservation_rules;
    }
    
    if (user_content) {
      updateData.user_content = {};
      if (user_content.rating_avg !== undefined) {
        if (user_content.rating_avg < 0 || user_content.rating_avg > 5) {
          return res.status(400).json({
            success: false,
            message: "Rating average must be between 0 and 5",
          });
        }
        updateData.user_content.rating_avg = user_content.rating_avg;
      }
      if (user_content.rating_count !== undefined) {
        if (user_content.rating_count < 0) {
          return res.status(400).json({
            success: false,
            message: "Rating count must be a non-negative number",
          });
        }
        updateData.user_content.rating_count = user_content.rating_count;
      }
    }

    const updatedTrailInfo = await TrailInfo.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Trail info updated successfully",
      trailInfo: updatedTrailInfo,
    });
  } catch (error) {
    console.error("Update trail info error:", error);
    
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
        message: "Invalid trail info ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// DELETE TRAIL INFO
export const deleteTrailInfo = async (req, res) => {
  try {
    const { id } = req.params;

    const trailInfo = await TrailInfo.findById(id);
    if (!trailInfo) {
      return res.status(404).json({
        success: false,
        message: "Trail info not found",
      });
    }

    await TrailInfo.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Trail info deleted successfully",
    });
  } catch (error) {
    console.error("Delete trail info error:", error);
    
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid trail info ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

