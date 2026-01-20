// routes/native/trailInfo.routes.js
import express from "express";
import { getTrailInfoByTrailId } from "../../controllers/native/nativeTrailInfoController.js";
import { validateParams } from "../../middleware/nativeValidator.js";

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

