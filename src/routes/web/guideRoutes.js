// routes/web/guideRoutes.js
import express from "express";
import {
  createGuide,
  getAllGuides,
  getGuideById,
  updateGuide,
  deleteGuide,
} from "../../controllers/web/guideController.js";

const router = express.Router();

// CRUD Operations
router.post("/", createGuide);
router.get("/", getAllGuides);
router.get("/:id", getGuideById);
router.put("/:id", updateGuide);
router.delete("/:id", deleteGuide);

export default router;

