import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, unique: true, sparse: true },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    counselorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    type: { type: String, enum: ["credit", "debit", "refund"], default: "credit" },
    status: { type: String, enum: ["pending", "completed", "failed", "hold", "refunded"], default: "pending" },
    paymentMethod: { type: String },
    platformFee: { type: Number, default: 0 }, // Commission/fee retained by platform
    counselorEarnings: { type: Number, default: 0 }, // Amount earned by counselor
    description: { type: String },
    relatedTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
