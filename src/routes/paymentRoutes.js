import express from "express";
import { getWalletPayments, getWalletPaymentStats } from "../controllers/paymentController.js";
import { verifyAdminToken } from "../middleware/simpleAdminAuth.js";

const router = express.Router();

router.get("/", verifyAdminToken, getWalletPayments);
router.get("/stats", verifyAdminToken, getWalletPaymentStats);

export default router;
