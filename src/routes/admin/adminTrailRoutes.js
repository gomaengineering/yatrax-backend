// routes/admin/adminTrailRoutes.js
import express from "express";
import {
  getAllTrails,
  getTrailById,
  createTrail,
  updateTrail,
  deleteTrail,
} from "../../controllers/admin/adminTrailController.js";
import { protect, adminOnly } from "../../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication and admin role
router.use(protect, adminOnly);

// Trail Management Routes
router.get("/", getAllTrails);
router.get("/:id", getTrailById);
router.post("/", createTrail);
router.put("/:id", updateTrail);
router.delete("/:id", deleteTrail);

export default router;

