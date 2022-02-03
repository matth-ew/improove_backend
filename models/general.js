import mongoose from "mongoose";
const Schema = mongoose.Schema;

const GeneralSchema = new Schema({
  week_training_id: { type: Number, default: 0 },
});

export default mongoose.model("General", GeneralSchema, "General");
