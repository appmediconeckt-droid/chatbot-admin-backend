import mongoose from "mongoose";

const adminAccountSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  createdBy: { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.AdminAccount || mongoose.model("AdminAccount", adminAccountSchema);
