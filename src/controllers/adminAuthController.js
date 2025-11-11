// controllers/adminAuthController.js
import User from "../models/userModel.js";
import Guide from "../models/guideModel.js";
import generateToken from "../utils/generateToken.js";

// ADMIN LOGIN (Can login as admin from User or Guide model)
export const loginAdmin = async (req, res) => {
  try {
    // Safely extract body data with default empty object
    const body = req.body || {};
    const { email, password, userType } = body; // userType: 'user' or 'guide'

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    let admin = null;
    let adminData = null;

    // Try to find admin in User model first, then Guide model
    if (!userType || userType === "user") {
      admin = await User.findOne({ email: email.toLowerCase() }).select("+password");
      if (admin && admin.role === "admin") {
        adminData = {
          id: admin._id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          role: admin.role,
          subscription: admin.subscription,
          country: admin.country,
          type: "user",
        };
      }
    }

    // If not found in User, try Guide model
    if (!adminData && (!userType || userType === "guide")) {
      admin = await Guide.findOne({ email: email.toLowerCase() }).select("+password");
      if (admin && admin.role === "admin") {
        adminData = {
          id: admin._id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          role: admin.role,
          description: admin.description,
          TBNumber: admin.TBNumber,
          type: "guide",
        };
      }
    }

    if (!admin || !adminData) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials or not an admin",
      });
    }

    // Compare passwords
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = generateToken(admin._id, admin.role);

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      token,
      admin: adminData,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// GET ADMIN PROFILE
export const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.userId;
    const adminRole = req.userRole;

    let admin = null;

    // Find admin based on role
    if (adminRole === "admin") {
      // Try User model first
      admin = await User.findById(adminId);
      if (!admin || admin.role !== "admin") {
        // Try Guide model
        admin = await Guide.findById(adminId);
      }
    }

    if (!admin || admin.role !== "admin") {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Return admin data without password
    const adminData = {
      id: admin._id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: admin.role,
    };

    // Add model-specific fields
    if (admin.subscription !== undefined) {
      adminData.subscription = admin.subscription;
      adminData.country = admin.country;
      adminData.type = "user";
    } else if (admin.TBNumber !== undefined) {
      adminData.description = admin.description;
      adminData.TBNumber = admin.TBNumber;
      adminData.type = "guide";
    }

    res.status(200).json({
      success: true,
      admin: adminData,
    });
  } catch (error) {
    console.error("Get admin profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

