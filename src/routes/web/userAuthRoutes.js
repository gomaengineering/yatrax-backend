import express from "express";
import {
  getGoogleClientId,
  googleLogin,
  loginUser,
  registerUser,
  forgotPassword,
  completeForgotPassword,
} from "../../controllers/web/userAuthController.js";

const router = express.Router();

router.get("/google-client-id", getGoogleClientId);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google-login", googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/forgot-password/complete", completeForgotPassword);

export default router;

