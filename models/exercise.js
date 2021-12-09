import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ExerciseSchema = new Schema({
  title: { type: String, default: "" },
  video: { type: String, default: "", select: false },
  preview: { type: String, default: "" },
  tips: { type: String, default: "" },
  mistakes: { type: String, default: "" },
  how: { type: String, default: "" },
});

// export our module to use in server.js
export default ExerciseSchema;
