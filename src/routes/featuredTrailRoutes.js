// routes/featuredTrailRoutes.js
import express from "express";
import {
  getAllFeaturedTrails,
  getFeaturedTrailById,
  createFeaturedTrail,
  updateFeaturedTrail,
  deleteFeaturedTrail,
} from "../controllers/featuredTrailController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication and admin role
router.use(protect, adminOnly);

// Featured Trail Routes
router.get("/", getAllFeaturedTrails);
router.get("/:id", getFeaturedTrailById);
router.post("/", createFeaturedTrail);
router.put("/:id", updateFeaturedTrail);
router.delete("/:id", deleteFeaturedTrail);

export default router;

