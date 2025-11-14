// controllers/featuredTrailController.js
import FeaturedTrail from "../models/featuredTrailModel.js";
import { uploadImage, deleteImage } from "../utils/cloudinary.js";

// GET ALL FEATURED TRAILS
export const getAllFeaturedTrails = async (req, res) => {
  try {
    const featuredTrails = await FeaturedTrail.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: featuredTrails.length,
      featuredTrails,
    });
  } catch (error) {
    console.error("Get all featured trails error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// GET FEATURED TRAIL BY ID
export const getFeaturedTrailById = async (req, res) => {
  try {
    const { id } = req.params;

    const featuredTrail = await FeaturedTrail.findById(id);

    if (!featuredTrail) {
      return res.status(404).json({
        success: false,
        message: "Featured trail not found",
      });
    }

    res.status(200).json({
      success: true,
      featuredTrail,
    });
  } catch (error) {
    console.error("Get featured trail by ID error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid featured trail ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// CREATE FEATURED TRAIL
export const createFeaturedTrail = async (req, res) => {
  try {
    // Check if request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Request body is missing or invalid.",
      });
    }

    const { name, location, time, activityType, difficulty } = req.body;

    // Validate required fields
    if (!name || !location || !time || !activityType || !difficulty) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: name, location, time, activityType, difficulty",
      });
    }

    // Validate activityType enum
    const validActivityTypes = ["Hike", "Trekking", "City Tour"];
    if (!validActivityTypes.includes(activityType)) {
      return res.status(400).json({
        success: false,
        message: `activityType must be one of: ${validActivityTypes.join(", ")}`,
      });
    }

    // Validate difficulty enum
    const validDifficulties = ["Easy", "Moderate", "Hard", "Extreme"];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: `difficulty must be one of: ${validDifficulties.join(", ")}`,
      });
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
        imageUrl = await uploadImage(imageInput);
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

    // Create featured trail
    const newFeaturedTrail = await FeaturedTrail.create({
      name,
      location,
      time,
      activityType,
      difficulty,
      image: imageUrl,
    });

    res.status(201).json({
      success: true,
      message: "Featured trail created successfully",
      featuredTrail: newFeaturedTrail,
    });
  } catch (error) {
    console.error("Create featured trail error:", error);
    
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

// UPDATE FEATURED TRAIL
export const updateFeaturedTrail = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, time, activityType, difficulty } = req.body;

    // Check if featured trail exists
    const featuredTrail = await FeaturedTrail.findById(id);
    if (!featuredTrail) {
      return res.status(404).json({
        success: false,
        message: "Featured trail not found",
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

    // Validate difficulty if provided
    if (difficulty) {
      const validDifficulties = ["Easy", "Moderate", "Hard", "Extreme"];
      if (!validDifficulties.includes(difficulty)) {
        return res.status(400).json({
          success: false,
          message: `difficulty must be one of: ${validDifficulties.join(", ")}`,
        });
      }
    }

    // Handle image update
    let imageUrl = featuredTrail.image; // Keep existing image by default
    
    // Check for file upload (multer handles files with any field name)
    const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : null;
    
    if (uploadedFile && uploadedFile.path) {
      // New image uploaded via multer
      // Delete old image from Cloudinary if it exists
      if (featuredTrail.image && featuredTrail.image.includes('cloudinary.com')) {
        try {
          await deleteImage(featuredTrail.image);
        } catch (error) {
          console.error("Error deleting old image:", error);
          // Continue even if deletion fails
        }
      }
      imageUrl = uploadedFile.path;
    } else if (req.body.imageUrl || req.body.image) {
      // New image URL provided
      const newImageInput = req.body.imageUrl || req.body.image;
      if (newImageInput !== featuredTrail.image) {
        // Delete old image from Cloudinary if it exists
        if (featuredTrail.image && featuredTrail.image.includes('cloudinary.com')) {
          try {
            await deleteImage(featuredTrail.image);
          } catch (error) {
            console.error("Error deleting old image:", error);
            // Continue even if deletion fails
          }
        }
        // Upload new image
        try {
          imageUrl = await uploadImage(newImageInput);
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: "Failed to upload new image.",
          });
        }
      }
    }

    // Build update data
    const updateData = {};
    if (name) updateData.name = name;
    if (location) updateData.location = location;
    if (time) updateData.time = time;
    if (activityType) updateData.activityType = activityType;
    if (difficulty) updateData.difficulty = difficulty;
    if (imageUrl) updateData.image = imageUrl;

    const updatedFeaturedTrail = await FeaturedTrail.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Featured trail updated successfully",
      featuredTrail: updatedFeaturedTrail,
    });
  } catch (error) {
    console.error("Update featured trail error:", error);
    
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
        message: "Invalid featured trail ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// DELETE FEATURED TRAIL
export const deleteFeaturedTrail = async (req, res) => {
  try {
    const { id } = req.params;

    const featuredTrail = await FeaturedTrail.findById(id);
    if (!featuredTrail) {
      return res.status(404).json({
        success: false,
        message: "Featured trail not found",
      });
    }

    // Delete image from Cloudinary if it exists
    if (featuredTrail.image && featuredTrail.image.includes('cloudinary.com')) {
      try {
        await deleteImage(featuredTrail.image);
      } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        // Continue with deletion even if image deletion fails
      }
    }

    await FeaturedTrail.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Featured trail deleted successfully",
    });
  } catch (error) {
    console.error("Delete featured trail error:", error);
    
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid featured trail ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

