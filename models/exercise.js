import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ExerciseSchema = new Schema({
  video: { type: String, default: "", select: false },
  description: { type: String, default: "" },
  preview: { type: String, default: "" },
  title: { type: String, default: "" },
  tips: { type: [String], default: [] },
  mistakes: { type: [String], default: [] },
  how: { type: [String], default: [] },
  goal: { type: String, default: "" },
});

// export our module to use in server.js
export default ExerciseSchema;
