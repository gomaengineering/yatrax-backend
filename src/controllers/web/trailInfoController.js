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
    const featuredTrails = await TrailInfo.find()
      .select("name region country difficulty duration_days activityType image")
      .sort({ createdAt: -1 });

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

    res.status(200).json({
      success: true,
      count: formattedTrails.length,
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

