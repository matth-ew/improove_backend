import { Training } from "../models";
import actionsUser from "../methods/user";
import async from "async";

var functions = {
  getTrainings: function (req, res) {
    let query = Training.find();
    if (req.body.ids && req.body.ids.length > 0)
      query.where("_id").in(req.body.ids);
    if (req.body.newest && req.body.newest > 0) {
      query.limit(req.body.newest).sort({ _id: 1 });
    }
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
          return res.json({
            success: true,
            result: trainings,
          });
        }
      });
  },
  getTrainingById: function (req, res) {
    let query = Training.findOne().where("_id").equals(req.body.id);
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
            success: true,
            result: training,
          });
        }
      });
  },
  setTrainingDescription: function (req, res) {
    let query = Training.updateOne(
      { _id: req.body.id, trainer_id: req.user._id },
      {
        $set: {
          description: req.body.text,
        },
      }
    );
    query.exec((err /*, mongo_res*/) => {
      if (err)
        return res.json({
          success: false,
          error: err,
        });
      else return res.json({ success: true });
    });
  },
  setExerciseMistakes: function (req, res) {
    let query = Training.updateOne(
      {
        _id: req.body.id,
        trainer_id: req.user._id,
        exercises: {
          $elemMatch: {
            title: req.body.title,
          },
        },
      },
      {
        $set: {
          "exercises.$.mistakes": req.body.mistakes,
        },
      }
    );
    query.exec((err /*, mongo_res*/) => {
      if (err)
        return res.json({
          success: false,
          error: err,
        });
      else return res.json({ success: true });
    });
  },
  setExerciseHow: function (req, res) {
    let query = Training.updateOne(
      {
        _id: req.body.id,
        trainer_id: req.user._id,
        exercises: {
          $elemMatch: {
            title: req.body.title,
          },
        },
      },
      {
        $set: {
          "exercises.$.how": req.body.how,
        },
      }
    );
    query.exec((err /*, mongo_res*/) => {
      if (err)
        return res.json({
          success: false,
          error: err,
        });
      else return res.json({ success: true });
    });
  },
  setExerciseTips: function (req, res) {
    Training.findOneAndUpdate(
      {
        _id: req.body.id,
        trainer_id: req.user._id,
        exercises: {
          $elemMatch: {
            title: req.body.title,
          },
        },
      },
      {
        $set: {
          "exercises.$.tips": req.body.tips,
        },
      },
      function (err, training) {
        if (err) {
          console.log("err", err);
          return res.json({
            success: false,
            error: err,
          });
        } else {
          return res.json({ success: true });
        }
      }
    );
  },
};

export default functions;
