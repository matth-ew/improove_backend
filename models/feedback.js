import mongoose from "mongoose";
const Schema = mongoose.Schema;

const FeedbackSchema = new Schema(
  {
    user_id: Number,
    text: { type: String, default: "" },
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

// export our module to use in server.js
export default mongoose.model("Feedback", FeedbackSchema, "Feedback");
