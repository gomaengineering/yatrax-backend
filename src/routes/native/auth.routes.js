// routes/native/auth.routes.js
import express from "express";
import { loginUser, refreshToken, logout } from "../../controllers/native/nativeAuthController.js";
import { optionalAuth } from "../../middleware/authMiddleware.js";
import { authRateLimiter, refreshTokenRateLimiter, nativeRateLimiter } from "../../middleware/nativeRateLimiter.js";
import { validateBody } from "../../middleware/nativeValidator.js";

const router = express.Router();

// Login route with rate limiting and validation
router.post(
  "/login",
  authRateLimiter,
  validateBody({
    email: {
      required: true,
      type: "string",
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: "Please provide a valid email address",
      maxLength: 255,
    },
    password: {
      required: true,
      type: "string",
      minLength: 8,
      maxLength: 128,
    },
    deviceId: {
      required: false,
      type: "string",
      maxLength: 255,
    },
    deviceInfo: {
      required: false,
      type: "object",
    },
    _whitelist: true, // Only allow these fields
  }),
  loginUser
);

// Refresh token route with rate limiting and validation
router.post(
  "/refresh",
  refreshTokenRateLimiter,
  validateBody({
    refreshToken: {
      required: true,
      type: "string",
      minLength: 64, // Refresh tokens are 64 hex characters
      maxLength: 64,
    },
    deviceId: {
      required: false,
      type: "string",
      maxLength: 255,
    },
    deviceInfo: {
      required: false,
      type: "object",
    },
    _whitelist: true,
  }),
  refreshToken
);

// Logout route with rate limiting and validation
router.post(
  "/logout",
  nativeRateLimiter,
  validateBody({
    refreshToken: {
      required: false,
      type: "string",
      minLength: 64,
      maxLength: 64,
    },
    _whitelist: true,
  }),
  optionalAuth,
  logout
);

export default router;