import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ExerciseSchema = new Schema(
  {
    video: { type: String, default: "" },
    preview: { type: String, default: "" },
    tips: { type: String, default: "" },
    mistakes: { type: String, default: "" },
    how: { type: String, default: "" },
  },
  { _id: false }
);

// export our module to use in server.js
export default ExerciseSchema;
