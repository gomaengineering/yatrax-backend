import express from "express";
import { googleLogin, loginUser, registerUser } from "../controllers/userAuthController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google-login", googleLogin); // Google login route

export default router;