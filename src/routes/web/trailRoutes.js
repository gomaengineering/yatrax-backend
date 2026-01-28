// routes/web/trailRoutes.js
import express from "express";
import {
  createTrail,
  createTrailsFromFeatureCollection,
  getAllTrails,
  getTrailById,
  updateTrail,
  deleteTrail,
  findTrailsNear,
  findTrailsWithin,
  findTrailsWithinRadius,
  findTrailsIntersecting,
  getTrailGuides,
} from "../../controllers/web/trailController.js";

const router = express.Router();

// Geospatial Queries (must be before parameterized routes)
router.get("/near/point", findTrailsNear);
router.post("/within/polygon", findTrailsWithin);
router.get("/within/radius", findTrailsWithinRadius);
router.post("/intersecting", findTrailsIntersecting);

// CRUD Operations
router.post("/feature-collection", createTrailsFromFeatureCollection); // Import FeatureCollection
router.post("/", createTrail);
router.get("/", getAllTrails);

// Trail-Guide Relationship Operations (must be before /:id route)
router.get("/:id/guides", getTrailGuides);

// Single trail operations (must be after relationship routes)
router.get("/:id", getTrailById);
router.put("/:id", updateTrail);
router.delete("/:id", deleteTrail);

export default router;

