// utils/appErrors.example.js
/**
 * Example usage of app error handling utilities
 * This file demonstrates how to use the error handling system in controllers
 */

import { AppError, ErrorCodes, sendErrorResponse, handleError, asyncHandler } from "./appErrors.js";

// ============================================
// Example 1: Using AppError class
// ============================================
export const exampleUsingAppError = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError(ErrorCodes.MISSING_REQUIRED_FIELD, null, { field: "email" });
    }

    // ... rest of logic
  } catch (error) {
    return handleError(res, error);
  }
};

// ============================================
// Example 2: Using sendErrorResponse helper
// ============================================
export const exampleUsingHelper = async (req, res) => {
  const user = await findUser(req.params.id);

  if (!user) {
    return sendErrorResponse(res, ErrorCodes.RESOURCE_NOT_FOUND, "User not found");
  }

  // ... rest of logic
};

// ============================================
// Example 3: Using asyncHandler wrapper
// ============================================
export const exampleWithAsyncHandler = asyncHandler(async (req, res) => {
  // No need for try-catch, errors are automatically handled
  const user = await findUser(req.params.id);

  if (!user) {
    throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND);
  }

  res.json({ success: true, data: user });
});

// ============================================
// Example 4: Validation errors with details
// ============================================
export const exampleValidationError = async (req, res) => {
  const errors = {
    email: ["Email is required", "Email format is invalid"],
    password: ["Password must be at least 8 characters"],
  };

  return sendErrorResponse(
    res,
    ErrorCodes.VALIDATION_ERROR,
    "Validation failed",
    { errors }
  );
};

// ============================================
// Example 5: Custom error with details
// ============================================
export const exampleCustomError = async (req, res) => {
  return sendErrorResponse(
    res,
    ErrorCodes.INVALID_CREDENTIALS,
    "Login failed. Please check your credentials.",
    { attemptsRemaining: 2 }
  );
};

