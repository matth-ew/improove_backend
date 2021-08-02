import mongoose from "mongoose";
import ExerciseSchema from "./exercise"
const Schema = mongoose.Schema;

const TrainingsSchema = new Schema(
  {
    video: { type: String, default: "" },
    preview: { type: String, default: "" },
    tips: { type: String, default: "" },
    mistakes: { type: String, default: "" },
    how: { type: String, default: "" }
  },
  {_id: false }
);

// export our module to use in server.js
export default mongoose.model("Exercise", UsersSchema, "Exercises");
