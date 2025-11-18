// routes/trailInfoRoutes.js
import express from "express";
import {
  getAllTrailInfo,
  getTrailInfoById,
  createTrailInfo,
  updateTrailInfo,
  deleteTrailInfo,
} from "../controllers/trailInfoController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { optionalUpload, createUploadToCloudinary } from "../utils/cloudinary.js";

const router = express.Router();

// All routes require authentication and admin role
// router.use(protect, adminOnly);

// Trail Info Routes
router.get("/",getAllTrailInfo);
router.get("/:id", getTrailInfoById);
// Use optionalUpload to allow both file upload (field: 'image') or imageUrl in body
// Use 'trail-info' folder for Cloudinary uploads
router.post("/", protect, adminOnly, optionalUpload.any(), createUploadToCloudinary('trail-info'), createTrailInfo);
router.put("/:id", protect, adminOnly, optionalUpload.any(), createUploadToCloudinary('trail-info'), updateTrailInfo);
router.delete("/:id", protect, adminOnly, deleteTrailInfo);

export default router;

