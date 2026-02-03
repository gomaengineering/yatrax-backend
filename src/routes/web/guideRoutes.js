// routes/web/guideRoutes.js
import express from "express";
import {
  createGuide,
  getAllGuides,
  getGuideById,
  updateGuide,
  deleteGuide,
} from "../../controllers/web/guideController.js";
import {
  getGuideAvailability,
  setGuideAvailability,
} from "../../controllers/web/guideAvailabilityController.js";
import { protect, isResourceOwner, optionalAuth } from "../../middleware/authMiddleware.js";

const router = express.Router();

// CRUD Operations
router.post("/", createGuide);
router.get("/", optionalAuth, getAllGuides);

// Guide availability (authenticated users only) - must be before /:id
router.get("/:id/availability", protect, getGuideAvailability);
router.put("/:id/availability", protect, isResourceOwner("guide"), setGuideAvailability);

router.get("/:id", optionalAuth, getGuideById);
router.put("/:id", protect, isResourceOwner("guide"), updateGuide);
router.delete("/:id", protect, isResourceOwner("guide"), deleteGuide);

// Note: Guide-Trail relationship operations are admin-only
// See /api/admin/guides routes for assign/remove trail functionality

export default router;

