// controllers/native/nativeTrailController.js
import Trail from "../../models/trailModel.js";
import TrailInfo from "../../models/trailInfoModel.js";
import { handleError, ErrorCodes } from "../../utils/nativeErrors.js";

/**
 * Simplify geometry for list view
 * Returns first/last point for LineString, bounding box for Polygon
 */
const simplifyGeometry = (geometry) => {
  if (!geometry || !geometry.coordinates) {
    return null;
  }

  const { type, coordinates } = geometry;

  switch (type) {
    case "Point":
      return {
        type: "Point",
        coordinates: coordinates,
      };

    case "LineString":
      // Return first and last point only
      if (coordinates.length >= 2) {
        return {
          type: "LineString",
          coordinates: [coordinates[0], coordinates[coordinates.length - 1]],
        };
      }
      return {
        type: "LineString",
        coordinates: coordinates,
      };

    case "Polygon":
      // Return bounding box (first ring's corners)
      if (coordinates.length > 0 && coordinates[0].length >= 4) {
        const ring = coordinates[0];
        const lngs = ring.map((coord) => coord[0]);
        const lats = ring.map((coord) => coord[1]);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        return {
          type: "Polygon",
          coordinates: [
            [
              [minLng, minLat],
              [maxLng, minLat],
              [maxLng, maxLat],
              [minLng, maxLat],
              [minLng, minLat], // Close the box
            ],
          ],
        };
      }
      return {
        type: "Polygon",
        coordinates: coordinates,
      };

    case "MultiPoint":
      // Return first and last point
      if (coordinates.length >= 2) {
        return {
          type: "MultiPoint",
          coordinates: [coordinates[0], coordinates[coordinates.length - 1]],
        };
      }
      return {
        type: "MultiPoint",
        coordinates: coordinates,
      };

    case "MultiLineString":
      // Return first point of first line and last point of last line
      if (coordinates.length > 0) {
        const firstLine = coordinates[0];
        const lastLine = coordinates[coordinates.length - 1];
        if (firstLine.length > 0 && lastLine.length > 0) {
          return {
            type: "MultiLineString",
            coordinates: [[firstLine[0], lastLine[lastLine.length - 1]]],
          };
        }
      }
      return {
        type: "MultiLineString",
        coordinates: coordinates,
      };

    case "MultiPolygon":
      // Return bounding box of first polygon
      if (coordinates.length > 0 && coordinates[0].length > 0 && coordinates[0][0].length >= 4) {
        const firstRing = coordinates[0][0];
        const lngs = firstRing.map((coord) => coord[0]);
        const lats = firstRing.map((coord) => coord[1]);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        return {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [minLng, minLat],
                [maxLng, minLat],
                [maxLng, maxLat],
                [minLng, maxLat],
                [minLng, minLat],
              ],
            ],
          ],
        };
      }
      return {
        type: "MultiPolygon",
        coordinates: coordinates,
      };

    default:
      return {
        type: type,
        coordinates: coordinates,
      };
  }
};

/**
 * Get all trails with pagination and filtering
 * GET /api/native/trails
 */
export const getAllTrails = async (req, res) => {
  try {
    // Extract query parameters
    const {
      page = 1,
      limit = 20,
      name,
      difficulty,
      activityType,
      region,
      country,
      hasTrailInfo,
      minRating,
      sort = "createdAt",
      longitude,
      latitude,
      radius,
    } = req.query;

    // Validate and parse pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};

    // Filter by name (search in properties.name)
    if (name) {
      query["properties.name"] = { $regex: name.trim(), $options: "i" };
    }

    // Filter by difficulty (numeric from properties)
    if (difficulty) {
      const diffNum = parseInt(difficulty, 10);
      if (!isNaN(diffNum)) {
        query["properties.difficulty"] = diffNum;
      }
    }

    // Geospatial filter (find trails within radius)
    if (longitude && latitude) {
      const lng = parseFloat(longitude);
      const lat = parseFloat(latitude);
      const rad = radius ? parseFloat(radius) : 10; // Default 10km

      if (!isNaN(lng) && !isNaN(lat) && !isNaN(rad) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90 && rad > 0 && rad <= 100) {
        // Convert radius from kilometers to radians (Earth's radius ≈ 6371 km)
        const radiusInRadians = rad / 6371;
        query.geometry = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusInRadians],
          },
        };
      }
    }

    // Execute initial trail query
    const trails = await Trail.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count before filtering by TrailInfo
    const totalBeforeTrailInfoFilter = await Trail.countDocuments(query);

    // Populate TrailInfo for all trails
    await Trail.populateTrailInfo(trails);

    // Filter by TrailInfo-related fields and build TrailInfo query
    const trailInfoQuery = {};
    if (activityType) {
      trailInfoQuery.activityType = activityType;
    }
    if (region) {
      trailInfoQuery.region = { $regex: region.trim(), $options: "i" };
    }
    if (country) {
      trailInfoQuery.country = { $regex: country.trim(), $options: "i" };
    }
    if (minRating) {
      const minRatingNum = parseFloat(minRating);
      if (!isNaN(minRatingNum)) {
        trailInfoQuery["user_content.rating_avg"] = { $gte: minRatingNum };
      }
    }

    // Filter trails based on TrailInfo criteria and hasTrailInfo flag
    let filteredTrails = trails;
    if (Object.keys(trailInfoQuery).length > 0 || hasTrailInfo === "true") {
      // Get TrailInfo IDs that match the criteria
      const matchingTrailInfos = await TrailInfo.find(trailInfoQuery).select("_id").lean();
      const matchingTrailInfoIds = new Set(matchingTrailInfos.map((ti) => ti._id.toString()));

      filteredTrails = trails.filter((trail) => {
        const trailInfoId = trail.properties?.trailInfoId?.toString();
        const hasMatchingTrailInfo = trailInfoId && matchingTrailInfoIds.has(trailInfoId);

        if (hasTrailInfo === "true") {
          return hasMatchingTrailInfo;
        } else if (hasTrailInfo === "false") {
          return !hasMatchingTrailInfo;
        } else {
          // If TrailInfo filters are applied, only return trails with matching TrailInfo
          return hasMatchingTrailInfo;
        }
      });
    } else if (hasTrailInfo === "false") {
      // Only return trails without TrailInfo
      filteredTrails = trails.filter((trail) => !trail.properties?.trailInfoId);
    }

    // Build sort object
    let sortObj = { createdAt: -1 }; // Default: newest first
    if (sort === "name") {
      // Sort by name (from properties or TrailInfo)
      filteredTrails.sort((a, b) => {
        const nameA = a.trailInfo?.name || a.properties?.name || "";
        const nameB = b.trailInfo?.name || b.properties?.name || "";
        return nameA.localeCompare(nameB);
      });
    } else if (sort === "difficulty") {
      // Sort by difficulty (from properties)
      filteredTrails.sort((a, b) => {
        const diffA = a.properties?.difficulty || 0;
        const diffB = b.properties?.difficulty || 0;
        return diffA - diffB;
      });
    } else if (sort === "rating") {
      // Sort by rating (from TrailInfo)
      filteredTrails.sort((a, b) => {
        const ratingA = a.trailInfo?.user_content?.rating_avg || 0;
        const ratingB = b.trailInfo?.user_content?.rating_avg || 0;
        return ratingB - ratingA; // Descending
      });
    }

    // Transform trails for list view (with full geometry)
    const transformedTrails = filteredTrails.map((trail) => {
      const trailInfo = trail.trailInfo || null;
      const hasTrailInfoFlag = !!trailInfo;

      return {
        properties: {
          id: trail._id.toString(),
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

    // Calculate total count (approximate for filtered results)
    // For accurate count, we'd need to do a more complex query, but for performance
    // we'll use the filtered results count
    const total = filteredTrails.length < limitNum && pageNum === 1
      ? filteredTrails.length
      : totalBeforeTrailInfoFilter; // Approximation

    // Calculate pagination metadata
    const pages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: {
        trails: transformedTrails,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredTrails.length,
          pages: Math.ceil(filteredTrails.length / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all trails error:", error);
    return handleError(res, error);
  }
};

/**
 * Get trail by ID (detailed view)
 * GET /api/native/trails/:id
 */
export const getTrailById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trail ID format",
        error: {
          code: ErrorCodes.INVALID_FIELD_VALUE,
          type: "validation_error",
        },
      });
    }

    // Find trail
    const trail = await Trail.findById(id).lean();

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

    // Populate TrailInfo if exists
    await Trail.populateTrailInfo([trail]);

    const trailInfo = trail.trailInfo || null;

    // Transform trail for detail view (full fields)
    const transformedTrail = {
      id: trail._id.toString(),
      type: trail.type,
      geometry: trail.geometry, // Full geometry
      properties: trail.properties || {},
      trailInfo: trailInfo
        ? {
            id: trailInfo._id.toString(),
            name: trailInfo.name,
            region: trailInfo.region,
            country: trailInfo.country,
            description: trailInfo.description,
            difficulty: trailInfo.difficulty,
            activityType: trailInfo.activityType,
            duration_days: trailInfo.duration_days,
            total_distance_km: trailInfo.total_distance_km,
            best_season: trailInfo.best_season || [],
            major_highlights: trailInfo.major_highlights || [],
            starting_point: trailInfo.starting_point || null,
            ending_point: trailInfo.ending_point || null,
            altitude_min_m: trailInfo.altitude_min_m,
            altitude_max_m: trailInfo.altitude_max_m,
            permit_required: trailInfo.permit_required || [],
            environment: trailInfo.environment || null,
            user_content: trailInfo.user_content || null,
            image: trailInfo.image,
          }
        : null,
    };

    res.status(200).json({
      success: true,
      data: transformedTrail,
    });
  } catch (error) {
    console.error("Get trail by ID error:", error);
    return handleError(res, error);
  }
};

