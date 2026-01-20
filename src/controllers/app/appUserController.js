// controllers/app/appUserController.js
import User from "../../models/userModel.js";

/**
 * Get current user's profile
 * GET /api/native/profile
 */
export const getProfile = async (req, res) => {
  try {
    // User ID comes from protect middleware (req.userId)
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Find user by ID (password is excluded by default in schema)
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return minimal safe fields
    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        country: user.country || null,
        role: user.role,
        subscription: user.subscription,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * Update current user's profile
 * PUT /api/native/profile
 */
export const updateProfile = async (req, res) => {
  try {
    // User ID comes from protect middleware (req.userId)
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const { firstName, lastName, country } = req.body;

    // Define allowed fields (whitelist)
    const allowedFields = ["firstName", "lastName", "country"];
    const providedFields = Object.keys(req.body);

    // Check for restricted fields
    const restrictedFields = ["email", "password", "role", "subscription", "_id", "id"];
    const hasRestrictedFields = providedFields.some((field) => restrictedFields.includes(field));

    if (hasRestrictedFields) {
      return res.status(400).json({
        success: false,
        message: "Cannot update email, password, role, or subscription through this endpoint",
      });
    }

    // Check for unknown fields
    const unknownFields = providedFields.filter((field) => !allowedFields.includes(field));
    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Unknown fields: ${unknownFields.join(", ")}. Allowed fields: ${allowedFields.join(", ")}`,
      });
    }

    // Validation rules
    const errors = {};

    // Validate firstName
    if (firstName !== undefined) {
      if (typeof firstName !== "string") {
        errors.firstName = "First name must be a string";
      } else {
        const trimmed = firstName.trim();
        if (trimmed.length === 0) {
          errors.firstName = "First name cannot be empty";
        } else if (trimmed.length > 50) {
          errors.firstName = "First name must be 50 characters or less";
        }
      }
    }

    // Validate lastName
    if (lastName !== undefined) {
      if (typeof lastName !== "string") {
        errors.lastName = "Last name must be a string";
      } else {
        const trimmed = lastName.trim();
        if (trimmed.length === 0) {
          errors.lastName = "Last name cannot be empty";
        } else if (trimmed.length > 50) {
          errors.lastName = "Last name must be 50 characters or less";
        }
      }
    }

    // Validate country
    if (country !== undefined) {
      if (country !== null && typeof country !== "string") {
        errors.country = "Country must be a string or null";
      } else if (typeof country === "string" && country.trim().length > 100) {
        errors.country = "Country must be 100 characters or less";
      }
    }

    // Return validation errors if any
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    // Build update object with only provided and valid fields
    const updateData = {};

    if (firstName !== undefined) {
      updateData.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      updateData.lastName = lastName.trim();
    }

    if (country !== undefined) {
      // Treat empty string as null
      updateData.country = country === "" || country === null ? null : country.trim();
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    // Find user first to ensure they exist
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user with validated data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    // Return updated profile
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        country: updatedUser.country || null,
        role: updatedUser.role,
        subscription: updatedUser.subscription,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

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
        message: "Invalid user ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

