import express from "express";
import { loginGuide, registerGuide } from "../../controllers/web/guideAuthController.js";

const router = express.Router();

router.post("/register", registerGuide);
router.post("/login", loginGuide);

export default router;

