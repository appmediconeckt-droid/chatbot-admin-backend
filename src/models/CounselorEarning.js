import mongoose from "mongoose";

const counselorEarningSchema = new mongoose.Schema(
  {
    counselorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sessionId: mongoose.Schema.Types.ObjectId,
    transactionId: mongoose.Schema.Types.ObjectId,
    callId: String,
    chatId: mongoose.Schema.Types.ObjectId,
    sessionType: String,
    totalAmount: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    earningAmount: { type: Number, default: 0 },
    earningStatus: { type: String, default: "completed", index: true },
    payoutStatus: { type: String, default: "pending", index: true },
    paidAt: Date,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true, collection: "counselorearnings" }
);

export default mongoose.models.CounselorEarning ||
  mongoose.model("CounselorEarning", counselorEarningSchema);
