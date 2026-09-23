import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  direction: { type: String, enum: ["INBOUND", "OUTBOUND"], required: true },
  from: { type: String, required: true },
  to: { type: String },
  body: { type: String, required: true },
  externalMessageId: { type: String },
  sentBy: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  requesterName: { type: String, default: "" },
  requesterEmail: { type: String, required: true, index: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ["OPEN", "PENDING", "RESOLVED"], default: "OPEN", index: true },
  priority: { type: String, enum: ["LOW", "NORMAL", "HIGH", "URGENT"], default: "NORMAL", index: true },
  source: { type: String, enum: ["EMAIL", "WEBHOOK", "MANUAL"], default: "EMAIL" },
  messages: { type: [messageSchema], default: [] },
  unreadByAdmin: { type: Boolean, default: true, index: true },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  resolvedAt: { type: Date, default: null },
  assignedTo: { type: String, default: "" }
}, { timestamps: true });

supportTicketSchema.index({ status: 1, lastMessageAt: -1 });

export default mongoose.models.SupportTicket || mongoose.model("SupportTicket", supportTicketSchema);
