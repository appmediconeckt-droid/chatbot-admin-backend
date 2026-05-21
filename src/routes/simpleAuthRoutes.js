import express from "express";
import { adminLogin, getAdminProfile, adminLogout, changePassword } from "../controllers/simpleAuthController.js";
import { verifyAdminToken } from "../middleware/simpleAdminAuth.js";

const router = express.Router();

router.post("/login", adminLogin);
router.get("/profile", verifyAdminToken, getAdminProfile);
router.post("/logout", verifyAdminToken, adminLogout);
router.post("/change-password", verifyAdminToken, changePassword);

export default router;
