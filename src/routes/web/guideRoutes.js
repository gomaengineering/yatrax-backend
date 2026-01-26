// routes/web/guideRoutes.js
import express from "express";
import {
  createGuide,
  getAllGuides,
  getGuideById,
  updateGuide,
  deleteGuide,
} from "../../controllers/web/guideController.js";
import { protect, isResourceOwner } from "../../middleware/authMiddleware.js";

const router = express.Router();

// CRUD Operations
router.post("/", createGuide);
router.get("/", getAllGuides);
router.get("/:id", getGuideById);
router.put("/:id", protect, isResourceOwner('guide'), updateGuide);
router.delete("/:id", protect, isResourceOwner('guide'), deleteGuide);

export default router;

