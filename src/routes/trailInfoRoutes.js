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

const router = express.Router();

// All routes require authentication and admin role
router.use(protect, adminOnly);

// Trail Info Routes
router.get("/", getAllTrailInfo);
router.get("/:id", getTrailInfoById);
router.post("/", createTrailInfo);
router.put("/:id", updateTrailInfo);
router.delete("/:id", deleteTrailInfo);

export default router;

