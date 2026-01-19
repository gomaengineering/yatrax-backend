// utils/appErrors.js
/**
 * App-specific error handling utilities
 * Provides standardized error codes, messages, and response format
 */

/**
 * Error code constants for app APIs
 */
export const ErrorCodes = {
  // Authentication errors
  NO_TOKEN: "NO_TOKEN",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_NOT_ACTIVE: "TOKEN_NOT_ACTIVE",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  INVALID_REFRESH_TOKEN: "INVALID_REFRESH_TOKEN",
  REFRESH_TOKEN_EXPIRED: "REFRESH_TOKEN_EXPIRED",
  
  // Authorization errors
  ACCESS_DENIED: "ACCESS_DENIED",
  INVALID_ROLE: "INVALID_ROLE",
  ROLE_MISMATCH: "ROLE_MISMATCH",
  
  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_FIELD_VALUE: "INVALID_FIELD_VALUE",
  INVALID_EMAIL_FORMAT: "INVALID_EMAIL_FORMAT",
  INVALID_PASSWORD_FORMAT: "INVALID_PASSWORD_FORMAT",
  FIELD_TOO_LONG: "FIELD_TOO_LONG",
  FIELD_TOO_SHORT: "FIELD_TOO_SHORT",
  INVALID_ENUM_VALUE: "INVALID_ENUM_VALUE",
  UNKNOWN_FIELDS: "UNKNOWN_FIELDS",
  
  // Resource errors
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  RESOURCE_ALREADY_EXISTS: "RESOURCE_ALREADY_EXISTS",
  RESOURCE_CONFLICT: "RESOURCE_CONFLICT",
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  AUTH_RATE_LIMIT_EXCEEDED: "AUTH_RATE_LIMIT_EXCEEDED",
  REFRESH_RATE_LIMIT_EXCEEDED: "REFRESH_RATE_LIMIT_EXCEEDED",
  
  // Server errors
  SERVER_ERROR: "SERVER_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  
  // Request errors
  BAD_REQUEST: "BAD_REQUEST",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  UNSUPPORTED_MEDIA_TYPE: "UNSUPPORTED_MEDIA_TYPE",
};

/**
 * Error type categories
 */
export const ErrorTypes = {
  AUTHENTICATION_ERROR: "authentication_error",
  AUTHORIZATION_ERROR: "authorization_error",
  VALIDATION_ERROR: "validation_error",
  RATE_LIMIT_ERROR: "rate_limit_error",
  RESOURCE_ERROR: "resource_error",
  SERVER_ERROR: "server_error",
  CLIENT_ERROR: "client_error",
};

/**
 * User-safe error messages
 * Maps error codes to user-friendly messages
 */
export const ErrorMessages = {
  [ErrorCodes.NO_TOKEN]: "Authentication required. Please provide a valid access token.",
  [ErrorCodes.INVALID_TOKEN]: "Invalid access token. Please login again.",
  [ErrorCodes.TOKEN_EXPIRED]: "Access token has expired. Please refresh your token.",
  [ErrorCodes.TOKEN_NOT_ACTIVE]: "Token is not yet valid.",
  [ErrorCodes.INVALID_CREDENTIALS]: "Invalid email or password.",
  [ErrorCodes.USER_NOT_FOUND]: "User account not found.",
  [ErrorCodes.INVALID_REFRESH_TOKEN]: "Invalid or revoked refresh token.",
  [ErrorCodes.REFRESH_TOKEN_EXPIRED]: "Refresh token has expired. Please login again.",
  
  [ErrorCodes.ACCESS_DENIED]: "Access denied. You don't have permission to perform this action.",
  [ErrorCodes.INVALID_ROLE]: "Access denied. Invalid user role.",
  [ErrorCodes.ROLE_MISMATCH]: "Token role mismatch. Please login again.",
  
  [ErrorCodes.VALIDATION_ERROR]: "Validation failed. Please check your input.",
  [ErrorCodes.MISSING_REQUIRED_FIELD]: "Required field is missing.",
  [ErrorCodes.INVALID_FIELD_VALUE]: "Invalid field value provided.",
  [ErrorCodes.INVALID_EMAIL_FORMAT]: "Please provide a valid email address.",
  [ErrorCodes.INVALID_PASSWORD_FORMAT]: "Password must be at least 8 characters long.",
  [ErrorCodes.FIELD_TOO_LONG]: "Field value is too long.",
  [ErrorCodes.FIELD_TOO_SHORT]: "Field value is too short.",
  [ErrorCodes.INVALID_ENUM_VALUE]: "Invalid value. Please choose from allowed options.",
  [ErrorCodes.UNKNOWN_FIELDS]: "Unknown fields provided.",
  
  [ErrorCodes.RESOURCE_NOT_FOUND]: "Requested resource not found.",
  [ErrorCodes.RESOURCE_ALREADY_EXISTS]: "Resource already exists.",
  [ErrorCodes.RESOURCE_CONFLICT]: "Resource conflict occurred.",
  
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: "Too many requests. Please try again later.",
  [ErrorCodes.AUTH_RATE_LIMIT_EXCEEDED]: "Too many login attempts. Please try again after 15 minutes.",
  [ErrorCodes.REFRESH_RATE_LIMIT_EXCEEDED]: "Too many token refresh attempts. Please try again later.",
  
  [ErrorCodes.SERVER_ERROR]: "An unexpected error occurred. Please try again later.",
  [ErrorCodes.DATABASE_ERROR]: "Database operation failed. Please try again.",
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: "External service error. Please try again later.",
  
  [ErrorCodes.BAD_REQUEST]: "Invalid request. Please check your input.",
  [ErrorCodes.PAYLOAD_TOO_LARGE]: "Request payload is too large.",
  [ErrorCodes.UNSUPPORTED_MEDIA_TYPE]: "Unsupported media type.",
};

/**
 * HTTP status code mapping for error codes
 */
export const ErrorStatusCodes = {
  [ErrorCodes.NO_TOKEN]: 401,
  [ErrorCodes.INVALID_TOKEN]: 401,
  [ErrorCodes.TOKEN_EXPIRED]: 401,
  [ErrorCodes.TOKEN_NOT_ACTIVE]: 401,
  [ErrorCodes.INVALID_CREDENTIALS]: 401,
  [ErrorCodes.USER_NOT_FOUND]: 404,
  [ErrorCodes.INVALID_REFRESH_TOKEN]: 401,
  [ErrorCodes.REFRESH_TOKEN_EXPIRED]: 401,
  
  [ErrorCodes.ACCESS_DENIED]: 403,
  [ErrorCodes.INVALID_ROLE]: 403,
  [ErrorCodes.ROLE_MISMATCH]: 401,
  
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCodes.INVALID_FIELD_VALUE]: 400,
  [ErrorCodes.INVALID_EMAIL_FORMAT]: 400,
  [ErrorCodes.INVALID_PASSWORD_FORMAT]: 400,
  [ErrorCodes.FIELD_TOO_LONG]: 400,
  [ErrorCodes.FIELD_TOO_SHORT]: 400,
  [ErrorCodes.INVALID_ENUM_VALUE]: 400,
  [ErrorCodes.UNKNOWN_FIELDS]: 400,
  
  [ErrorCodes.RESOURCE_NOT_FOUND]: 404,
  [ErrorCodes.RESOURCE_ALREADY_EXISTS]: 409,
  [ErrorCodes.RESOURCE_CONFLICT]: 409,
  
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.AUTH_RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.REFRESH_RATE_LIMIT_EXCEEDED]: 429,
  
  [ErrorCodes.SERVER_ERROR]: 500,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,
  
  [ErrorCodes.BAD_REQUEST]: 400,
  [ErrorCodes.PAYLOAD_TOO_LARGE]: 413,
  [ErrorCodes.UNSUPPORTED_MEDIA_TYPE]: 415,
};

/**
 * Custom AppError class for app-specific errors
 */
export class AppError extends Error {
  constructor(code, message = null, details = null, statusCode = null) {
    super(message || ErrorMessages[code] || "An error occurred");
    this.name = "AppError";
    this.code = code;
    this.message = message || ErrorMessages[code] || "An error occurred";
    this.details = details;
    this.statusCode = statusCode || ErrorStatusCodes[code] || 500;
    this.type = this.getErrorType(code);
    
    // Capture stack trace (but won't be sent to client)
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get error type from error code
   */
  getErrorType(code) {
    if (code.startsWith("NO_TOKEN") || code.startsWith("INVALID_TOKEN") || 
        code.startsWith("TOKEN") || code.startsWith("INVALID_CREDENTIALS") ||
        code.startsWith("USER_NOT_FOUND") || code.startsWith("INVALID_REFRESH")) {
      return ErrorTypes.AUTHENTICATION_ERROR;
    }
    if (code.startsWith("ACCESS_DENIED") || code.startsWith("INVALID_ROLE") || 
        code.startsWith("ROLE")) {
      return ErrorTypes.AUTHORIZATION_ERROR;
    }
    if (code.startsWith("VALIDATION") || code.startsWith("MISSING") || 
        code.startsWith("INVALID_FIELD") || code.startsWith("FIELD") || 
        code.startsWith("UNKNOWN_FIELDS")) {
      return ErrorTypes.VALIDATION_ERROR;
    }
    if (code.startsWith("RATE_LIMIT")) {
      return ErrorTypes.RATE_LIMIT_ERROR;
    }
    if (code.startsWith("RESOURCE")) {
      return ErrorTypes.RESOURCE_ERROR;
    }
    if (code.startsWith("SERVER") || code.startsWith("DATABASE") || 
        code.startsWith("EXTERNAL_SERVICE")) {
      return ErrorTypes.SERVER_ERROR;
    }
    return ErrorTypes.CLIENT_ERROR;
  }

  /**
   * Convert to JSON response format
   */
  toJSON() {
    const response = {
      success: false,
      message: this.message,
      error: {
        code: this.code,
        type: this.type,
      },
    };

    // Add details if provided
    if (this.details) {
      if (this.details.errors) {
        // Validation errors with field-level details
        response.error.errors = this.details.errors;
      } else if (typeof this.details === "object") {
        // Other structured details
        response.error.details = this.details;
      } else {
        // Simple details
        response.error.details = this.details;
      }
    }

    return response;
  }
}

/**
 * Create standardized error response
 * @param {string} code - Error code
 * @param {string} message - Custom message (optional)
 * @param {Object} details - Additional error details (optional)
 * @param {number} statusCode - HTTP status code (optional, auto-detected)
 * @returns {Object} Error response object
 */
export const createErrorResponse = (code, message = null, details = null, statusCode = null) => {
  const error = new AppError(code, message, details, statusCode);
  return {
    response: error.toJSON(),
    statusCode: error.statusCode,
  };
};

/**
 * Send error response
 * @param {Response} res - Express response object
 * @param {string} code - Error code
 * @param {string} message - Custom message (optional)
 * @param {Object} details - Additional error details (optional)
 * @param {number} statusCode - HTTP status code (optional)
 */
export const sendErrorResponse = (res, code, message = null, details = null, statusCode = null) => {
  const { response, statusCode: httpStatus } = createErrorResponse(code, message, details, statusCode);
  return res.status(httpStatus).json(response);
};

/**
 * Handle and send error response
 * Supports both AppError instances and regular errors
 * @param {Response} res - Express response object
 * @param {Error|AppError} error - Error object
 */
export const handleError = (res, error) => {
  // If it's already an AppError, use it directly
  if (error instanceof AppError) {
    return res.status(error.statusCode).json(error.toJSON());
  }

  // Handle known error types
  if (error.name === "ValidationError") {
    // Mongoose validation error
    const errors = {};
    if (error.errors) {
      Object.keys(error.errors).forEach((key) => {
        errors[key] = [error.errors[key].message];
      });
    }
    return sendErrorResponse(res, ErrorCodes.VALIDATION_ERROR, "Validation failed", { errors });
  }

  if (error.name === "CastError") {
    return sendErrorResponse(res, ErrorCodes.INVALID_FIELD_VALUE, "Invalid ID format");
  }

  if (error.name === "MongoServerError" && error.code === 11000) {
    // Duplicate key error
    const field = Object.keys(error.keyPattern || {})[0] || "field";
    return sendErrorResponse(
      res,
      ErrorCodes.RESOURCE_ALREADY_EXISTS,
      `${field} already exists`,
      { field }
    );
  }

  // Log unexpected errors (server-side only)
  console.error("Unexpected error:", {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });

  // Return generic server error (no stack trace or sensitive info)
  return sendErrorResponse(res, ErrorCodes.SERVER_ERROR);
};

/**
 * Async error wrapper for route handlers
 * Catches errors and sends standardized responses
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      handleError(res, error);
    });
  };
};

