// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Guide from "../models/guideModel.js";

// Protect routes - requires authentication
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user or guide based on role
      let user = null;
      if (decoded.role === "admin" || decoded.role === "user" || decoded.role === "porter") {
        user = await User.findById(decoded.id);
      } else if (decoded.role === "guide") {
        user = await Guide.findById(decoded.id);
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      req.user = user;
      req.userId = decoded.id;
      req.userRole = decoded.role;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid token",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Admin only - requires admin role
export const adminOnly = async (req, res, next) => {
  try {
    // First check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, please login",
      });
    }

    // Check if user has admin role
    if (req.userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Optional: Role-based access control
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, please login",
      });
    }

    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      });
    }

    next();
  };
};

