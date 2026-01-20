import express from "express";
import { loginGuide, registerGuide } from "../../controllers/web/guideAuthController.js";
import { optionalUpload, createUploadToCloudinary } from "../../utils/cloudinary.js";

const router = express.Router();

// Guide registration with optional photo upload
// Use optionalUpload to allow both file upload (field: 'photo') or photoUrl in body
// Use 'guides' folder for Cloudinary uploads
router.post("/register", optionalUpload.any(), createUploadToCloudinary('guides'), registerGuide);
router.post("/login", loginGuide);

export default router;

