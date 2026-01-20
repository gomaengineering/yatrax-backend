// middleware/nativeAuthMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

/**
 * Native-specific authentication middleware
 * Validates access tokens and attaches authenticated user to request
 * Only works with User model (not Guide)
 */
export const nativeProtect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Check if token is provided
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please provide a valid access token.",
        error: {
          code: "NO_TOKEN",
          type: "authentication_error",
        },
      });
    }

    try {
      // Verify and decode JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Validate token type (must be access token for app)
      if (decoded.type && decoded.type !== "access") {
        return res.status(401).json({
          success: false,
          message: "Invalid token type. Access token required.",
          error: {
            code: "INVALID_TOKEN_TYPE",
            type: "authentication_error",
          },
        });
      }

      // Validate required token payload fields
      if (!decoded.id || !decoded.role) {
        return res.status(401).json({
          success: false,
          message: "Invalid token format.",
          error: {
            code: "INVALID_TOKEN_FORMAT",
            type: "authentication_error",
          },
        });
      }

      // Find user by ID (only User model, not Guide)
      // App APIs are for regular users only
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found. Token may be invalid or user account may have been deleted.",
          error: {
            code: "USER_NOT_FOUND",
            type: "authentication_error",
          },
        });
      }

      // Verify user role is valid for native access
      // Native supports: user, porter (but not admin - admin uses admin APIs)
      const validAppRoles = ["user", "porter"];
      if (!validAppRoles.includes(decoded.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. This endpoint is for native users only.",
          error: {
            code: "INVALID_ROLE",
            type: "authorization_error",
          },
        });
      }

      // Verify role matches user's actual role
      if (user.role !== decoded.role) {
        return res.status(401).json({
          success: false,
          message: "Token role mismatch. Please login again.",
          error: {
            code: "ROLE_MISMATCH",
            type: "authentication_error",
          },
        });
      }

      // Attach user and metadata to request object
      req.user = user;
      req.userId = decoded.id;
      req.userRole = decoded.role;

      // Continue to next middleware/route handler
      next();
    } catch (error) {
      // Handle JWT-specific errors
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Access token has expired. Please refresh your token.",
          error: {
            code: "TOKEN_EXPIRED",
            type: "authentication_error",
            expiredAt: error.expiredAt,
          },
        });
      }

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid access token. Please login again.",
          error: {
            code: "INVALID_TOKEN",
            type: "authentication_error",
          },
        });
      }

      if (error.name === "NotBeforeError") {
        return res.status(401).json({
          success: false,
          message: "Token not yet valid.",
          error: {
            code: "TOKEN_NOT_ACTIVE",
            type: "authentication_error",
            date: error.date,
          },
        });
      }

      // Generic JWT error
      return res.status(401).json({
        success: false,
        message: "Token verification failed.",
        error: {
          code: "TOKEN_VERIFICATION_FAILED",
          type: "authentication_error",
        },
      });
    }
  } catch (error) {
    // Unexpected server error
    console.error("Native auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication service error. Please try again later.",
      error: {
        code: "SERVER_ERROR",
        type: "server_error",
      },
    });
  }
};

/**
 * Optional native authentication middleware
 * Sets req.user if token is valid, but doesn't fail if missing
 * Useful for endpoints that work with or without authentication
 */
export const nativeOptionalAuth = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // If no token, continue without authentication
    if (!token) {
      return next();
    }

    try {
      // Verify and decode JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Only process if it's an access token
      if (decoded.type && decoded.type !== "access") {
        return next();
      }

      // Validate required fields
      if (!decoded.id || !decoded.role) {
        return next();
      }

      // Find user (only User model)
      const user = await User.findById(decoded.id).select("-password");

      // Only set user if found and has valid native role
      if (user && ["user", "porter"].includes(decoded.role) && user.role === decoded.role) {
        req.user = user;
        req.userId = decoded.id;
        req.userRole = decoded.role;
      }
    } catch (error) {
      // Token invalid or expired, but don't fail - just continue without setting req.user
      // This allows public access with optional personalization
    }

    next();
  } catch (error) {
    // Don't fail on unexpected errors - just continue
    next();
  }
};

