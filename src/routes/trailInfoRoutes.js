// routes/trailInfoRoutes.js
import express from "express";
import { createTrailInfo } from "../controllers/trailInfoController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication and admin role
router.use(protect, adminOnly);

// Trail Info Routes
router.post("/", createTrailInfo);

export default router;

