// middleware/nativeErrorHandler.js
/**
 * Native-specific error handling middleware
 * Catches and formats errors for native API responses
 */

import { handleError, ErrorCodes, ErrorTypes } from "../utils/nativeErrors.js";

/**
 * Native error handler middleware
 * Should be placed after all native routes
 * Only handles errors from /api/native/* routes
 */
export const nativeErrorHandler = (err, req, res, next) => {
  // Only handle errors for native routes
  if (!req.path.startsWith("/api/native")) {
    return next(err);
  }

  // Handle the error using standardized error handler
  return handleError(res, err);
};

/**
 * 404 handler for native routes
 * Returns standardized 404 response
 */
export const nativeNotFoundHandler = (req, res) => {
  // Only handle 404s for native routes
  if (!req.path.startsWith("/api/native")) {
    return res.status(404).json({
      success: false,
      message: "Route not found",
    });
  }

  return res.status(404).json({
    success: false,
    message: "API endpoint not found",
    error: {
      code: "RESOURCE_NOT_FOUND",
      type: "resource_error",
      path: req.path,
      method: req.method,
    },
  });
};

/**
 * Handle unhandled promise rejections in native routes
 * Should be registered at application level
 */
export const handleUnhandledRejection = (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Log but don't crash - let the error handler deal with it
};

/**
 * Handle uncaught exceptions in native routes
 * Should be registered at application level
 */
export const handleUncaughtException = (error) => {
  console.error("Uncaught Exception:", error);
  // In production, you might want to gracefully shutdown
  // For now, just log and continue
};

