import { Training } from "../models";
import actionsUser from "../methods/user";
import async from "async";

var functions = {
  getTrainings: function (req, res) {
    let query = Training.where("_id").lt(20);
    query
      .select("_id title preview category")
      .populate({ path: "trainer_id", select: "_id profileImage" })
      .exec((err, trainings) => {
        if (err) {
          console.log("error in load trainings", err);
          return res.json({
            success: false,
            error: err,
          });
        } else {
          console.log("trainings", trainings);
          return res.json({
            success: false,
            result: trainings,
          });
        }
      });
  },
  getTrainingById: function (req, res) {
    let query = Training.where("_id").equals(req.body.id);
    query
      .populate({ path: "trainer_id", select: "_id profileImage" })
      .exec((err, training) => {
        if (err) {
          console.log("error in load training by id", err);
          return res.json({
            success: false,
            error: err,
          });
        } else {
          return res.json({
            success: false,
            result: training,
          });
        }
      });
  },
};

export default functions;
