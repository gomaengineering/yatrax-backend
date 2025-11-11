// routes/adminStatsRoutes.js
import express from "express";
import { getDashboardStats } from "../controllers/adminStatsController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication and admin role
router.use(protect, adminOnly);

// Statistics Routes
router.get("/dashboard", getDashboardStats);

export default router;

