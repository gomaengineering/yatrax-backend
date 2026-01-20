import express from "express";
import { googleLogin, loginUser, registerUser, getGoogleClientId } from "../../controllers/web/userAuthController.js";

const router = express.Router();

router.get("/google-client-id", getGoogleClientId); // Public endpoint to get Google Client ID
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google-login", googleLogin); // Google login route

export default router;

