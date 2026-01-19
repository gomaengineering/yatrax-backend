// routes/app/guide.routes.js
import express from "express";
import { getAllGuides, getGuideById } from "../../controllers/app/appGuideController.js";
import { validateQuery, validateParams } from "../../middleware/appValidator.js";

const router = express.Router();

// Get all guides with pagination and filtering
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

// Get guide by ID (detailed view)
router.get(
  "/:id",
  validateParams({
    id: {
      required: true,
      type: "string",
      isObjectId: true,
    },
  }),
  getGuideById
);

export default router;

