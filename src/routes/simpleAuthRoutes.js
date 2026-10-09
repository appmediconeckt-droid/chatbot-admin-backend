import express from "express";
import { adminLogin, getAdminProfile, adminLogout, changePassword, createAdmin } from "../controllers/simpleAuthController.js";
import { verifyAdminToken, requireSuperadmin } from "../middleware/simpleAdminAuth.js";

const router = express.Router();

router.post("/login", adminLogin);
router.post("/create-admin", verifyAdminToken, requireSuperadmin, createAdmin);
router.post("/admins", verifyAdminToken, requireSuperadmin, createAdmin);
router.get("/profile", verifyAdminToken, getAdminProfile);
router.post("/logout", verifyAdminToken, adminLogout);
router.post("/change-password", verifyAdminToken, changePassword);

export default router;
