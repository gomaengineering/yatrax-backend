// middleware/appErrorHandler.js
/**
 * App-specific error handling middleware
 * Catches and formats errors for app API responses
 */

import { handleError, ErrorCodes, ErrorTypes } from "../utils/appErrors.js";

/**
 * App error handler middleware
 * Should be placed after all app routes
 * Only handles errors from /api/v1/app/* routes
 */
export const appErrorHandler = (err, req, res, next) => {
  // Only handle errors for app routes
  if (!req.path.startsWith("/api/v1/app")) {
    return next(err);
  }

  // Handle the error using standardized error handler
  return handleError(res, err);
};

/**
 * 404 handler for app routes
 * Returns standardized 404 response
 */
export const appNotFoundHandler = (req, res) => {
  // Only handle 404s for app routes
  if (!req.path.startsWith("/api/v1/app")) {
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
 * Handle unhandled promise rejections in app routes
 * Should be registered at application level
 */
export const handleUnhandledRejection = (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Log but don't crash - let the error handler deal with it
};

/**
 * Handle uncaught exceptions in app routes
 * Should be registered at application level
 */
export const handleUncaughtException = (error) => {
  console.error("Uncaught Exception:", error);
  // In production, you might want to gracefully shutdown
  // For now, just log and continue
};

