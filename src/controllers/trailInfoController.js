// controllers/trailInfoController.js
import TrailInfo from "../models/trailInfoModel.js";
import Trail from "../models/trailModel.js";
import { uploadImage, deleteImage } from "../utils/cloudinary.js";

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

    let {
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
      location,
      time,
      activityType,
      isFeatured,
      trailId,
    } = req.body;

    // Parse JSON strings if they come from FormData
    // FormData sends nested objects as JSON strings
    // If they're already objects (from JSON request), keep them as is
    try {
      if (best_season && typeof best_season === 'string' && best_season.trim()) {
        best_season = JSON.parse(best_season);
      }
      if (major_highlights && typeof major_highlights === 'string' && major_highlights.trim()) {
        major_highlights = JSON.parse(major_highlights);
      }
      if (starting_point && typeof starting_point === 'string' && starting_point.trim()) {
        starting_point = JSON.parse(starting_point);
      }
      if (ending_point && typeof ending_point === 'string' && ending_point.trim()) {
        ending_point = JSON.parse(ending_point);
      }
      if (permit_required && typeof permit_required === 'string' && permit_required.trim()) {
        permit_required = JSON.parse(permit_required);
      }
      if (environment && typeof environment === 'string' && environment.trim()) {
        environment = JSON.parse(environment);
      }
      if (user_content && typeof user_content === 'string' && user_content.trim()) {
        user_content = JSON.parse(user_content);
      }
      // Parse numeric values that might come as strings from FormData
      if (typeof duration_days === 'string') {
        duration_days = parseInt(duration_days, 10);
      }
      if (typeof total_distance_km === 'string') {
        total_distance_km = parseFloat(total_distance_km);
      }
      if (typeof altitude_min_m === 'string') {
        altitude_min_m = parseFloat(altitude_min_m);
      }
      if (typeof altitude_max_m === 'string') {
        altitude_max_m = parseFloat(altitude_max_m);
      }
      if (isFeatured && typeof isFeatured === 'string') {
        isFeatured = isFeatured === 'true';
      }
      
      // Ensure starting_point and ending_point are objects after parsing
      if (starting_point && typeof starting_point === 'object') {
        // Ensure nested numeric values are properly typed
        if (starting_point.altitude_m && typeof starting_point.altitude_m === 'string') {
          starting_point.altitude_m = parseFloat(starting_point.altitude_m);
        }
      }
      if (ending_point && typeof ending_point === 'object') {
        // Ensure nested numeric values are properly typed
        if (ending_point.altitude_m && typeof ending_point.altitude_m === 'string') {
          ending_point.altitude_m = parseFloat(ending_point.altitude_m);
        }
      }
    } catch (parseError) {
      console.error('Error parsing FormData fields:', parseError);
      console.error('Request body:', req.body);
      return res.status(400).json({
        success: false,
        message: "Error parsing request data. Please ensure all fields are properly formatted.",
        error: parseError.message,
      });
    }

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
    if (!starting_point || typeof starting_point !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Starting point must be a valid object with 'name' and 'altitude_m' fields",
      });
    }
    if (!starting_point.name || starting_point.altitude_m === undefined) {
      return res.status(400).json({
        success: false,
        message: "Starting point must have both 'name' and 'altitude_m' fields",
      });
    }

    // Validate ending_point
    if (!ending_point || typeof ending_point !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Ending point must be a valid object with 'name' and 'altitude_m' fields",
      });
    }
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

    // Validate activityType if provided
    if (activityType) {
      const validActivityTypes = ["Hike", "Trekking", "City Tour"];
      if (!validActivityTypes.includes(activityType)) {
        return res.status(400).json({
          success: false,
          message: `activityType must be one of: ${validActivityTypes.join(", ")}`,
        });
      }
    }

    // Handle image upload
    let imageUrl = null;
    
    // Check for file upload (multer handles files with any field name)
    const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : null;
    
    if (uploadedFile && uploadedFile.path) {
      // Image uploaded via multer (file upload)
      imageUrl = uploadedFile.path; // Cloudinary returns secure_url in path
    } else if (req.body.imageUrl || req.body.image) {
      // Image provided as URL or base64 in body
      const imageInput = req.body.imageUrl || req.body.image;
      try {
        imageUrl = await uploadImage(imageInput, 'trail-info');
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Failed to upload image. Please provide a valid image URL or file.",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Image is required. Please provide an image file or imageUrl in the request body.",
      });
    }

    // Extract geometry and trailProperties from request body
    let { geometry, trailProperties } = req.body;
    
    // Parse JSON strings if they come from FormData
    try {
      if (geometry && typeof geometry === 'string' && geometry.trim()) {
        geometry = JSON.parse(geometry);
      }
      if (trailProperties && typeof trailProperties === 'string' && trailProperties.trim()) {
        trailProperties = JSON.parse(trailProperties);
      }
    } catch (parseError) {
      console.error('Error parsing geometry or trailProperties:', parseError);
      return res.status(400).json({
        success: false,
        message: "Error parsing geometry or trailProperties. Please ensure they are valid JSON.",
        error: parseError.message,
      });
    }

    // STEP 1: Create Trail FIRST if geometry is provided (AUTOMATIC FOREIGN KEY SYNCING)
    let trail = null;

    if (geometry && geometry.type && geometry.coordinates) {
      // Create Trail from provided geometry automatically
      try {
        const trailData = {
          type: "Feature",
          geometry,
          properties: trailProperties || {},
        };
        
        trail = await Trail.create(trailData);
        trailId = trail._id; // Automatically extract trailId from created Trail
        console.log("✅ Trail created automatically with ID:", trailId);
      } catch (trailError) {
        console.error("Error creating Trail:", trailError);
        return res.status(400).json({
          success: false,
          message: "Failed to create Trail from provided geometry",
          error: trailError.message,
        });
      }
    } else if (trailId) {
      // If trailId is provided explicitly, verify Trail exists
      trail = await Trail.findById(trailId);
      if (!trail) {
        return res.status(404).json({
          success: false,
          message: "Trail not found with provided trailId",
        });
      }
      // console.log("✅ Using existing Trail with ID:", trailId);
    }
    // If neither geometry nor trailId is provided, trailId will be null
    // This allows TrailInfo to exist without Trail initially

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
      image: imageUrl,
      location,
      time,
      activityType,
      isFeatured: isFeatured || false,
      trailId: trailId || null,
    };

    // Create trail info
    const newTrailInfo = await TrailInfo.create(trailInfoData);

    // STEP 2: Automatically sync back to Trail (bidirectional linking)
    if (trailId && trail) {
      // Update Trail properties with trailInfoId and activityType
      const properties = trail.properties || {};
      properties.trailInfoId = newTrailInfo._id;
      if (activityType) {
        properties.activityType = activityType;
      }
      
      // Use markModified because properties is Mixed type
      trail.markModified('properties');
      await trail.save();
      // console.log("✅ Trail automatically synced with TrailInfo ID:", newTrailInfo._id);
    }

    res.status(201).json({
      success: true,
      message: "Trail info created successfully",
      trailInfo: newTrailInfo,
      trail: trail ? {
        _id: trail._id,
        type: trail.type,
        geometry: trail.geometry,
      } : null,
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
      location,
      time,
      activityType,
      isFeatured,
      trailId,
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

    // Validate activityType if provided
    if (activityType) {
      const validActivityTypes = ["Hike", "Trekking", "City Tour"];
      if (!validActivityTypes.includes(activityType)) {
        return res.status(400).json({
          success: false,
          message: `activityType must be one of: ${validActivityTypes.join(", ")}`,
        });
      }
    }

    // Handle image update
    let imageUrl = trailInfo.image; // Keep existing image by default
    
    // Check for file upload (multer handles files with any field name)
    const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : null;
    
    if (uploadedFile && uploadedFile.path) {
      // New image uploaded via multer
      // Delete old image from Cloudinary if it exists
      if (trailInfo.image && trailInfo.image.includes('cloudinary.com')) {
        try {
          await deleteImage(trailInfo.image);
        } catch (error) {
          console.error("Error deleting old image:", error);
          // Continue even if deletion fails
        }
      }
      imageUrl = uploadedFile.path;
    } else if (req.body.imageUrl || req.body.image) {
      // New image URL provided
      const newImageInput = req.body.imageUrl || req.body.image;
      if (newImageInput !== trailInfo.image) {
        // Delete old image from Cloudinary if it exists
        if (trailInfo.image && trailInfo.image.includes('cloudinary.com')) {
          try {
            await deleteImage(trailInfo.image);
          } catch (error) {
            console.error("Error deleting old image:", error);
            // Continue even if deletion fails
          }
        }
        // Upload new image
        try {
          imageUrl = await uploadImage(newImageInput, 'trail-info');
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: "Failed to upload new image.",
          });
        }
      }
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
    if (imageUrl) updateData.image = imageUrl;
    if (location) updateData.location = location;
    if (time) updateData.time = time;
    if (activityType) updateData.activityType = activityType;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (trailId) updateData.trailId = trailId;
    
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

    // Update linked Trail model if trailId or activityType changed
    if (updatedTrailInfo.trailId) {
      const trail = await Trail.findById(updatedTrailInfo.trailId);
      if (trail) {
        const properties = trail.properties || {};
        properties.trailInfoId = updatedTrailInfo._id;
        if (updatedTrailInfo.activityType) {
          properties.activityType = updatedTrailInfo.activityType;
        }
        
        trail.markModified('properties');
        await trail.save();
      }
    }

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

    // Delete image from Cloudinary if it exists
    if (trailInfo.image && trailInfo.image.includes('cloudinary.com')) {
      try {
        await deleteImage(trailInfo.image);
      } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        // Continue with deletion even if image deletion fails
      }
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

