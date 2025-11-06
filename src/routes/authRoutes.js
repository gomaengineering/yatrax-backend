import express from "express";
import { googleLogin, loginUser, registerUser } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google-login", googleLogin); // Google login route

export default router;