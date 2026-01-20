// controllers/app/appTrailInfoController.js
import TrailInfo from "../../models/trailInfoModel.js";
import Trail from "../../models/trailModel.js";
import { handleError, ErrorCodes } from "../../utils/appErrors.js";

/**
 * Get TrailInfo for a specific trail
 * GET /api/native/trails/:trailId/info
 */
export const getTrailInfoByTrailId = async (req, res) => {
  try {
    const { trailId } = req.params;

    // Validate ObjectId format
    if (!trailId || !/^[0-9a-fA-F]{24}$/.test(trailId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trail ID format",
        error: {
          code: ErrorCodes.INVALID_FIELD_VALUE,
          type: "validation_error",
        },
      });
    }

    // Verify trail exists (trails are public, so no additional access check needed)
    const trail = await Trail.findById(trailId).lean();

    if (!trail) {
      return res.status(404).json({
        success: false,
        message: "Trail not found",
        error: {
          code: ErrorCodes.RESOURCE_NOT_FOUND,
          type: "resource_error",
        },
      });
    }

    // Find TrailInfo linked to this trail
    // TrailInfo can be linked via:
    // 1. TrailInfo.trailId === trailId
    // 2. Trail.properties.trailInfoId === TrailInfo._id
    let trailInfo = null;

    // First, check if TrailInfo is linked via trailId field
    trailInfo = await TrailInfo.findOne({ trailId: trailId }).lean();

    // If not found, check if Trail has trailInfoId in properties
    if (!trailInfo && trail.properties?.trailInfoId) {
      const trailInfoId = trail.properties.trailInfoId;
      trailInfo = await TrailInfo.findById(trailInfoId).lean();
    }

    if (!trailInfo) {
      return res.status(404).json({
        success: false,
        message: "Trail information not found for this trail",
        error: {
          code: ErrorCodes.RESOURCE_NOT_FOUND,
          type: "resource_error",
        },
      });
    }

    // Transform TrailInfo for app response (exclude admin-only fields)
    const transformedTrailInfo = {
      id: trailInfo._id.toString(),
      name: trailInfo.name,
      region: trailInfo.region,
      country: trailInfo.country,
      description: trailInfo.description,
      difficulty: trailInfo.difficulty,
      activityType: trailInfo.activityType || null,
      duration_days: trailInfo.duration_days,
      total_distance_km: trailInfo.total_distance_km,
      best_season: trailInfo.best_season || [],
      major_highlights: trailInfo.major_highlights || [],
      starting_point: trailInfo.starting_point || null,
      ending_point: trailInfo.ending_point || null,
      altitude_min_m: trailInfo.altitude_min_m,
      altitude_max_m: trailInfo.altitude_max_m,
      permit_required: trailInfo.permit_required || [],
      environment: trailInfo.environment
        ? {
            wildlife: trailInfo.environment.wildlife || [],
            local_culture: trailInfo.environment.local_culture || null,
            climate_conditions: trailInfo.environment.climate_conditions || null,
            conservation_rules: trailInfo.environment.conservation_rules || null,
          }
        : null,
      user_content: trailInfo.user_content
        ? {
            rating_avg: trailInfo.user_content.rating_avg || 0,
            rating_count: trailInfo.user_content.rating_count || 0,
          }
        : {
            rating_avg: 0,
            rating_count: 0,
          },
      image: trailInfo.image,
    };

    res.status(200).json({
      success: true,
      data: transformedTrailInfo,
    });
  } catch (error) {
    console.error("Get trail info by trail ID error:", error);
    return handleError(res, error);
  }
};

