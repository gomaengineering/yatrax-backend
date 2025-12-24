// routes/app/user.routes.js
import express from "express";
import { getProfile, updateProfile } from "../../controllers/app/appUserController.js";
import { appProtect } from "../../middleware/appAuthMiddleware.js";
import { validateBody } from "../../middleware/appValidator.js";

const router = express.Router();

// All routes require authentication (rate limiting applied globally in index.js)
router.use(appProtect);

// Profile routes
router.get("/profile", getProfile);

router.put(
  "/profile",
  validateBody({
    firstName: {
      required: false,
      type: "string",
      minLength: 1,
      maxLength: 50,
    },
    lastName: {
      required: false,
      type: "string",
      minLength: 1,
      maxLength: 50,
    },
    country: {
      required: false,
      type: "string",
      maxLength: 100,
    },
    _whitelist: true, // Only allow these fields
  }),
  updateProfile
);

export default router;

