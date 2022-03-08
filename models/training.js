import mongoose from "mongoose";
import ExerciseSchema from "./exercise";
// import GoalSchema from "./goal";
import Counter from "./counter";
const Schema = mongoose.Schema;

const TrainingsSchema = new Schema(
  {
    _id: Number,
    trainer_id: { type: Number, ref: "User" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    preview: { type: String, default: "" },
    category: { type: String, default: "" },
    freeExercises: { type: Number, default: 0 },
    approved: { type: Boolean, default: true },
    exercises: [ExerciseSchema],
    // goals: [GoalSchema],
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

TrainingsSchema.virtual("exercises_length").get(function () {
  if (!this.exercises) return 0;
  else return this.exercises.length;
});

TrainingsSchema.pre("save", function (next) {
  var doc = this;
  if (this._id > 0) {
    //console.log("in pre-save");
    return next();
  }

  Counter.findByIdAndUpdate(
    { _id: "trainingId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
    .then(function (counter, error) {
      if (error) {
        return next(error);
      }
      doc._id = counter.seq;
      //console.log("CONTEGGIO",counter.seq);
      //next();
    })
    .catch(function (error) {
      console.error("counter error-> : " + error);
      throw error;
    })
    .then(function () {
      next();
    });
});

// export our module to use in server.js
export default mongoose.model("Training", TrainingsSchema, "Trainings");
