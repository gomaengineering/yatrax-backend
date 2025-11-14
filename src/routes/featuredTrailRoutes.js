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
import { optionalUpload, uploadToCloudinary } from "../utils/cloudinary.js";

const router = express.Router();

// All routes require authentication and admin role
router.use(protect, adminOnly);

// Featured Trail Routes
router.get("/", getAllFeaturedTrails);
router.get("/:id", getFeaturedTrailById);
// Use optionalUpload to allow both file upload (field: 'image') or imageUrl in body
router.post("/", optionalUpload.any(), uploadToCloudinary, createFeaturedTrail);
router.put("/:id", optionalUpload.any(), uploadToCloudinary, updateFeaturedTrail);
router.delete("/:id", deleteFeaturedTrail);

export default router;

