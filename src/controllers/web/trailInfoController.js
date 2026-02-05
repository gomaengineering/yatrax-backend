// controllers/web/trailInfoController.js
import TrailInfo from "../../models/trailInfoModel.js";

// GET ALL TRAIL INFO
export const getAllTrailInfo = async (req, res) => {
  try {
    const { isFeatured } = req.query;
    
    const query = {};
    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured === 'true';
    }

    const trailInfoList = await TrailInfo.find(query).sort({ createdAt: -1 });

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

// GET FEATURED TRAILS (Specific response format)
export const getFeaturedTrails = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      difficulty,
      activityType,
      region,
      country,
      minDuration,
      maxDuration,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    // Filter by difficulty
    if (difficulty) {
      const difficulties = Array.isArray(difficulty)
        ? difficulty
        : difficulty.split(",").map((d) => d.trim());
      query.difficulty = { $in: difficulties };
    }

    // Filter by activity type
    if (activityType) {
      const activities = Array.isArray(activityType)
        ? activityType
        : activityType.split(",").map((a) => a.trim());
      query.activityType = { $in: activities };
    }

    // Filter by region
    if (region) {
      const regions = Array.isArray(region)
        ? region
        : region.split(",").map((r) => r.trim());
      query.region = { $in: regions };
    }

    // Filter by country
    if (country) {
      const countries = Array.isArray(country)
        ? country
        : country.split(",").map((c) => c.trim());
      query.country = { $in: countries };
    }

    // Filter by duration range
    if (minDuration || maxDuration) {
      query.duration_days = {};
      if (minDuration) {
        query.duration_days.$gte = parseInt(minDuration);
      }
      if (maxDuration) {
        query.duration_days.$lte = parseInt(maxDuration);
      }
    }

    // Search in name, description, region, and country
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { region: searchRegex },
        { country: searchRegex },
      ];
    }

    // Build sort object
    const sortOptions = {};
    const validSortFields = [
      "createdAt",
      "updatedAt",
      "name",
      "difficulty",
      "duration_days",
      "user_content.rating_avg",
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const featuredTrails = await TrailInfo.find(query)
      .select("name region country difficulty duration_days activityType image")
      .sort(sortOptions)
      .limit(limitNum)
      .skip(skip);

    const formattedTrails = featuredTrails.map(trail => ({
      id: trail._id,
      name: trail.name,
      region: trail.region,
      country: trail.country,
      difficulty: trail.difficulty,
      duration_days: trail.duration_days,
      activityType: trail.activityType,
      image: trail.image
    }));

    const total = await TrailInfo.countDocuments(query);

    res.status(200).json({
      success: true,
      count: formattedTrails.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limitNum),
      trails: formattedTrails,
    });
  } catch (error) {
    console.error("Get featured trails error:", error);
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

