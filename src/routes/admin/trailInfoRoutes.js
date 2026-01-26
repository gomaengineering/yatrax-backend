// routes/admin/trailInfoRoutes.js
import express from "express";
import {
  createTrailInfo,
  updateTrailInfo,
  deleteTrailInfo,
} from "../../controllers/admin/adminTrailInfoController.js";
import { protect, adminOnly } from "../../middleware/authMiddleware.js";
import { optionalUpload, createUploadToCloudinary } from "../../utils/cloudinary.js";
import { getAllTrailInfo, getFeaturedTrails, getTrailInfoById } from "../../controllers/web/trailInfoController.js";

const router = express.Router();

// All GET routes require authentication and admin role
router.get("/featured", protect, adminOnly, getFeaturedTrails); // Specific route before parameterized route
router.get("/:id", protect, adminOnly, getTrailInfoById);
router.get("/", protect, adminOnly, getAllTrailInfo);


// Admin-only Trail Info Management Routes (Create, Update, Delete)
// Use optionalUpload to allow both file upload (field: 'image') or imageUrl in body
// Use 'trail-info' folder for Cloudinary uploads
router.post("/", protect, adminOnly, optionalUpload.any(), createUploadToCloudinary('trail-info'), createTrailInfo);
router.put("/:id", protect, adminOnly, optionalUpload.any(), createUploadToCloudinary('trail-info'), updateTrailInfo);
router.delete("/:id", protect, adminOnly, deleteTrailInfo);

export default router;

