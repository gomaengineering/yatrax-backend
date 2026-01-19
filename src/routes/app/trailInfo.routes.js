// routes/app/trailInfo.routes.js
import express from "express";
import { getTrailInfoByTrailId } from "../../controllers/app/appTrailInfoController.js";
import { validateParams } from "../../middleware/appValidator.js";

const router = express.Router();

// Get TrailInfo for a specific trail
router.get(
  "/:trailId/info",
  validateParams({
    trailId: {
      required: true,
      type: "string",
      isObjectId: true,
    },
  }),
  getTrailInfoByTrailId
);

export default router;

