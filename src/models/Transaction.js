import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, unique: true, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    counselorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    type: { type: String, enum: ["SESSION", "SUBSCRIPTION", "REFUND", "PACKAGE"], default: "SESSION" },
    status: { type: String, enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"], default: "COMPLETED" },
    paymentMethod: { type: String, enum: ["CARD", "WALLET", "BANK_TRANSFER", "UPI"], default: "CARD" },
    platformFee: { type: Number, default: 0 }, // Commission/fee retained by platform
    counselorEarnings: { type: Number, default: 0 }, // Amount earned by counselor
    description: { type: String },
    metadata: { type: Object }
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
