// routes/admin/adminGuideRoutes.js
import express from "express";
import {
  getAllGuides,
  getGuideById,
  createGuide,
  updateGuide,
  deleteGuide,
} from "../../controllers/admin/adminGuideController.js";
import { protect, adminOnly } from "../../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication and admin role
router.use(protect, adminOnly);

// Guide Management Routes
router.get("/", getAllGuides);
router.get("/:id", getGuideById);
router.post("/", createGuide);
router.put("/:id", updateGuide);
router.delete("/:id", deleteGuide);

export default router;

