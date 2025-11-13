// routes/adminAuthRoutes.js
import express from "express";
import { loginAdmin, getAdminProfile } from "../controllers/adminAuthController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin Authentication Routes
router.post("/login", loginAdmin);
router.get("/profile", protect, adminOnly, getAdminProfile);

export default router;

