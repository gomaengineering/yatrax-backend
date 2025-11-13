// controllers/trailInfoController.js
import TrailInfo from "../models/trailInfoModel.js";

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

