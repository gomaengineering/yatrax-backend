// routes/web/guideRoutes.js
import express from "express";
import {
  createGuide,
  getAllGuides,
  getGuideById,
  updateGuide,
  deleteGuide,
  assignTrailToGuide,
  removeTrailFromGuide,
  getGuideTrails,
} from "../../controllers/web/guideController.js";
import { protect, isResourceOwner } from "../../middleware/authMiddleware.js";

const router = express.Router();

// CRUD Operations
router.post("/", createGuide);
router.get("/", getAllGuides);

// Guide-Trail Relationship Operations (must be before /:id route)
router.get("/:id/trails", getGuideTrails);
router.post("/:guideId/trails/:trailId", assignTrailToGuide);
router.delete("/:guideId/trails/:trailId", removeTrailFromGuide);

// Single guide operations (must be after relationship routes)
router.get("/:id", getGuideById);
router.put("/:id", protect, isResourceOwner('guide'), updateGuide);
router.delete("/:id", protect, isResourceOwner('guide'), deleteGuide);

export default router;

