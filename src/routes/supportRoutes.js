import express from "express";
import { verifyAdminToken } from "../middleware/simpleAdminAuth.js";
import { incomingSupportEmail, getSupportTickets, getSupportTicket, updateSupportTicket, replyToSupportTicket, getSupportStats } from "../controllers/supportController.js";

const router = express.Router();

router.post("/webhook/incoming", incomingSupportEmail);
router.get("/stats", verifyAdminToken, getSupportStats);
router.get("/", verifyAdminToken, getSupportTickets);
router.get("/:id", verifyAdminToken, getSupportTicket);
router.put("/:id", verifyAdminToken, updateSupportTicket);
router.post("/:id/reply", verifyAdminToken, replyToSupportTicket);

export default router;
