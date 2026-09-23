import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    counselorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    counselor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    review: { type: String, default: "" },
    comment: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
      index: true,
    },
  },
  { timestamps: true, collection: "reviews", strict: false }
);

const Review = mongoose.model("Review", reviewSchema);
export default Review;
