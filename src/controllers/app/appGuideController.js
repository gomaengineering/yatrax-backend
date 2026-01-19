// controllers/app/appGuideController.js
import Guide from "../../models/guideModel.js";
import { handleError, ErrorCodes } from "../../utils/appErrors.js";

/**
 * Get all guides with pagination and filtering
 * GET /api/v1/app/guides
 */
export const getAllGuides = async (req, res) => {
  try {
    // Extract query parameters
    const {
      page = 1,
      limit = 20,
      trekAreas,
      minExperience,
      maxRatePerDay,
      languages,
      search,
      sort = "createdAt",
    } = req.query;

    // Validate and parse pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};

    // Filter by trek areas
    if (trekAreas) {
      const areas = Array.isArray(trekAreas) ? trekAreas : trekAreas.split(",").map((a) => a.trim());
      query.trekAreas = { $in: areas };
    }

    // Filter by minimum experience
    if (minExperience) {
      const minExp = parseInt(minExperience, 10);
      if (!isNaN(minExp)) {
        query.experience = { $gte: minExp };
      }
    }

    // Filter by maximum rate per day
    if (maxRatePerDay) {
      const maxRate = parseFloat(maxRatePerDay);
      if (!isNaN(maxRate)) {
        query.ratePerDay = { $lte: maxRate };
      }
    }

    // Filter by languages
    if (languages) {
      const langList = Array.isArray(languages) ? languages : languages.split(",").map((l) => l.trim());
      query.languages = { $in: langList };
    }

    // Search in name, description, and education
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { description: searchRegex },
        { education: searchRegex },
      ];
    }

    // Build sort object
    let sortObj = { createdAt: -1 }; // Default: newest first
    if (sort === "experience") {
      sortObj = { experience: -1 }; // Most experienced first
    } else if (sort === "ratePerDay") {
      sortObj = { ratePerDay: 1 }; // Lowest rate first
    } else if (sort === "name") {
      sortObj = { firstName: 1, lastName: 1 }; // Alphabetical
    }

    // Execute query with pagination
    const [guides, total] = await Promise.all([
      Guide.find(query)
        .select("-password -email -TBNumber -role -__v")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(), // Use lean() for better performance
      Guide.countDocuments(query),
    ]);

    // Transform guides for list view (minimal fields)
    const transformedGuides = guides.map((guide) => {
      // Truncate description to 200 characters
      const truncatedDescription =
        guide.description && guide.description.length > 200
          ? guide.description.substring(0, 200) + "..."
          : guide.description;

      // Limit certifications to first 3
      const limitedCertifications = guide.certifications
        ? guide.certifications.slice(0, 3)
        : [];

      return {
        id: guide._id.toString(),
        name: `${guide.firstName} ${guide.lastName}`,
        description: truncatedDescription,
        trekAreas: guide.trekAreas || [],
        experience: guide.experience,
        languages: guide.languages || [],
        ratePerDay: guide.ratePerDay,
        certifications: limitedCertifications,
        education: guide.education,
      };
    });

    // Calculate pagination metadata
    const pages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: {
        guides: transformedGuides,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages,
        },
      },
    });
  } catch (error) {
    console.error("Get all guides error:", error);
    return handleError(res, error);
  }
};

/**
 * Get guide by ID (detailed view)
 * GET /api/v1/app/guides/:id
 */
export const getGuideById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid guide ID format",
        error: {
          code: ErrorCodes.INVALID_FIELD_VALUE,
          type: "validation_error",
        },
      });
    }

    // Find guide (exclude sensitive fields)
    const guide = await Guide.findById(id)
      .select("-password -email -TBNumber -role -__v")
      .lean();

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
        error: {
          code: ErrorCodes.RESOURCE_NOT_FOUND,
          type: "resource_error",
        },
      });
    }

    // Transform guide for detail view (full fields)
    const transformedGuide = {
      id: guide._id.toString(),
      firstName: guide.firstName,
      lastName: guide.lastName,
      name: `${guide.firstName} ${guide.lastName}`,
      description: guide.description,
      trekAreas: guide.trekAreas || [],
      experience: guide.experience,
      education: guide.education,
      languages: guide.languages || [],
      ratePerDay: guide.ratePerDay,
      certifications: guide.certifications || [],
    };

    res.status(200).json({
      success: true,
      data: transformedGuide,
    });
  } catch (error) {
    console.error("Get guide by ID error:", error);
    return handleError(res, error);
  }
};

