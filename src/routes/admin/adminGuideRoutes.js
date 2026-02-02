// routes/admin/adminGuideRoutes.js
import express from "express";
import {
  getAllGuides,
  getGuideById,
  createGuide,
  updateGuide,
  deleteGuide,
  assignTrailToGuide,
  removeTrailFromGuide,
  getGuideTrails,
} from "../../controllers/admin/adminGuideController.js";
import {
  getGuideAvailability,
  setGuideAvailability,
} from "../../controllers/admin/adminGuideAvailabilityController.js";
import { protect, adminOnly } from "../../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication and admin role
router.use(protect, adminOnly);

// Guide Management Routes
router.get("/", getAllGuides);
router.post("/", createGuide);

// Guide-Trail Relationship Operations (Admin Only) - Must be before /:id route
router.get("/:id/trails", getGuideTrails);
router.post("/:guideId/trails/:trailId", assignTrailToGuide);
router.delete("/:guideId/trails/:trailId", removeTrailFromGuide);

// Guide availability (Admin Only) - Must be before /:id route
router.get("/:id/availability", getGuideAvailability);
router.put("/:id/availability", setGuideAvailability);

// Single guide operations (must be after relationship routes)
router.get("/:id", getGuideById);
router.put("/:id", updateGuide);
router.delete("/:id", deleteGuide);

export default router;

