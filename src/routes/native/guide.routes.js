// routes/native/guide.routes.js
import express from "express";
import {
  getAllGuides,
  getGuideById,
  createGuide,
  updateGuide,
  deleteGuide,
} from "../../controllers/native/nativeGuideController.js";
import {
  getGuideAvailability,
  setGuideAvailability,
} from "../../controllers/native/nativeGuideAvailabilityController.js";
import { validateQuery, validateParams, validateBody } from "../../middleware/nativeValidator.js";
import { nativeProtect } from "../../middleware/nativeAuthMiddleware.js";
import { optionalAuth } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Get all guides with pagination and filtering (contact info only when authenticated)
router.get(
  "/",
  optionalAuth,
  validateQuery({
    page: {
      required: false,
      type: "integer",
      min: 1,
    },
    limit: {
      required: false,
      type: "integer",
      min: 1,
      max: 50,
    },
    trekAreas: {
      required: false,
      type: "string",
    },
    minExperience: {
      required: false,
      type: "integer",
      min: 0,
    },
    maxRatePerDay: {
      required: false,
      type: "number",
      min: 0,
    },
    languages: {
      required: false,
      type: "string",
    },
    search: {
      required: false,
      type: "string",
    },
    sort: {
      required: false,
      type: "string",
      enum: ["createdAt", "experience", "ratePerDay", "name"],
    },
  }),
  getAllGuides
);

// Get guide availability (date range) – requires authentication
router.get(
  "/:id/availability",
  nativeProtect,
  validateParams({
    id: {
      required: true,
      type: "string",
      isObjectId: true,
    },
  }),
  validateQuery({
    from: {
      required: true,
      type: "string",
    },
    to: {
      required: true,
      type: "string",
    },
  }),
  getGuideAvailability
);

// Set guide availability – requires authentication
router.put(
  "/:id/availability",
  nativeProtect,
  validateParams({
    id: {
      required: true,
      type: "string",
      isObjectId: true,
    },
  }),
  validateBody({
    date: {
      required: false,
      type: "string",
    },
    startDate: {
      required: false,
      type: "string",
    },
    endDate: {
      required: false,
      type: "string",
    },
    dates: {
      required: false,
      type: "array",
      items: {
        type: "string",
      },
    },
    status: {
      required: true,
      type: "string",
      enum: ["available", "not available"],
    },
    note: {
      required: false,
      type: "string",
    },
    _whitelist: true,
  }),
  setGuideAvailability
);

// Get guide by ID (detailed view; contact info only when authenticated)
router.get(
  "/:id",
  optionalAuth,
  validateParams({
    id: {
      required: true,
      type: "string",
      isObjectId: true,
    },
  }),
  getGuideById
);

// Create guide (requires authentication)
router.post(
  "/",
  nativeProtect,
  validateBody({
    firstName: {
      required: true,
      type: "string",
      minLength: 1,
      maxLength: 50,
    },
    lastName: {
      required: true,
      type: "string",
      minLength: 1,
      maxLength: 50,
    },
    email: {
      required: true,
      type: "string",
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: "Please provide a valid email address",
    },
    password: {
      required: true,
      type: "string",
      minLength: 8,
    },
    description: {
      required: true,
      type: "string",
      minLength: 1,
    },
    TBNumber: {
      required: true,
      type: "string",
    },
    trekAreas: {
      required: true,
      type: "array",
      minItems: 1,
      items: {
        type: "string",
      },
    },
    experience: {
      required: true,
      type: "integer",
      min: 0,
    },
    education: {
      required: true,
      type: "string",
    },
    languages: {
      required: true,
      type: "array",
      minItems: 1,
      items: {
        type: "string",
      },
    },
    ratePerDay: {
      required: true,
      type: "number",
      min: 0,
    },
    certifications: {
      required: true,
      type: "array",
      minItems: 1,
      items: {
        type: "string",
      },
    },
    role: {
      required: false,
      type: "string",
      enum: ["guide", "admin"],
    },
    _whitelist: true, // Only allow these fields
  }),
  createGuide
);

// Update guide (requires authentication)
router.put(
  "/:id",
  nativeProtect,
  validateParams({
    id: {
      required: true,
      type: "string",
      isObjectId: true,
    },
  }),
  validateBody({
    firstName: {
      required: false,
      type: "string",
      minLength: 1,
      maxLength: 50,
    },
    lastName: {
      required: false,
      type: "string",
      minLength: 1,
      maxLength: 50,
    },
    email: {
      required: false,
      type: "string",
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: "Please provide a valid email address",
    },
    password: {
      required: false,
      type: "string",
      minLength: 8,
    },
    description: {
      required: false,
      type: "string",
      minLength: 1,
    },
    TBNumber: {
      required: false,
      type: "string",
    },
    trekAreas: {
      required: false,
      type: "array",
      minItems: 1,
      items: {
        type: "string",
      },
    },
    experience: {
      required: false,
      type: "integer",
      min: 0,
    },
    education: {
      required: false,
      type: "string",
    },
    languages: {
      required: false,
      type: "array",
      minItems: 1,
      items: {
        type: "string",
      },
    },
    ratePerDay: {
      required: false,
      type: "number",
      min: 0,
    },
    certifications: {
      required: false,
      type: "array",
      minItems: 1,
      items: {
        type: "string",
      },
    },
    role: {
      required: false,
      type: "string",
      enum: ["guide", "admin"],
    },
    _whitelist: true, // Only allow these fields
  }),
  updateGuide
);

// Delete guide (requires authentication)
router.delete(
  "/:id",
  nativeProtect,
  validateParams({
    id: {
      required: true,
      type: "string",
      isObjectId: true,
    },
  }),
  deleteGuide
);

export default router;

