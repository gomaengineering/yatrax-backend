// routes/app/trail.routes.js
import express from "express";
import { getAllTrails, getTrailById } from "../../controllers/app/appTrailController.js";
import { validateQuery, validateParams } from "../../middleware/appValidator.js";

const router = express.Router();

// Get all trails with pagination and filtering (public endpoint - no authentication required)
router.get(
  "/",
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
    name: {
      required: false,
      type: "string",
    },
    difficulty: {
      required: false,
      type: "integer",
      min: 0,
    },
    activityType: {
      required: false,
      type: "string",
    },
    region: {
      required: false,
      type: "string",
    },
    country: {
      required: false,
      type: "string",
    },
    hasTrailInfo: {
      required: false,
      type: "string",
      enum: ["true", "false"],
    },
    minRating: {
      required: false,
      type: "number",
      min: 0,
      max: 5,
    },
    sort: {
      required: false,
      type: "string",
      enum: ["createdAt", "name", "difficulty", "rating"],
    },
    longitude: {
      required: false,
      type: "number",
      min: -180,
      max: 180,
    },
    latitude: {
      required: false,
      type: "number",
      min: -90,
      max: 90,
    },
    radius: {
      required: false,
      type: "number",
      min: 0.1,
      max: 100,
    },
  }),
  getAllTrails
);

// Get trail by ID (detailed view)
router.get(
  "/:id",
  validateParams({
    id: {
      required: true,
      type: "string",
      isObjectId: true,
    },
  }),
  getTrailById
);

export default router;

