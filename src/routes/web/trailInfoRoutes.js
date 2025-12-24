// routes/web/trailInfoRoutes.js
import express from "express";
import {
  getAllTrailInfo,
  getFeaturedTrails,
  getTrailInfoById,
} from "../../controllers/web/trailInfoController.js";

const router = express.Router();

// Public Trail Info Routes (no authentication required)
router.get("/featured", getFeaturedTrails); // Specific route before parameterized route
router.get("/:id", getTrailInfoById);
router.get("/", getAllTrailInfo);

// rest of the routes in this file are for admin which will be used to create, update, delete trail infos.

export default router;

