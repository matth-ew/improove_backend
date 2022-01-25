import { Training } from "../models";
import actionsUser from "../methods/user";
import async from "async";

var functions = {
  getTrainings: function (req, res) {
    try {
      let query = Training.find();
      if (req.body.ids && req.body.ids.length > 0)
        query.where("_id").in(req.body.ids);
      if (req.body.newest && req.body.newest > 0) {
        query.limit(req.body.newest);
      }
      query.sort({ _id: -1 });
      query
        .select("_id title preview category exercises_length exercises.niente")
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
              result: trainings.map((x) => {
                var x_obj = x.toObject();
                delete x_obj.exercises;
                return x_obj;
              }),
            });
          }
        });
    } catch (e) {
      console.log("error in load trainings", err);
      return res.json({
        success: false,
        error: e,
      });
    }
  },
  getTrainingById: function (req, res) {
    try {
      let query = Training.findOne().where("_id").equals(req.body.id);
      query.select(" +exercises.video ");
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
            if (
              req.user.subscribed == true ||
              req.user._id == training.trainer_id
            ) {
              return res.json({
                success: true,
                result: training,
                subscribed: req.user.subscribed,
              });
            } else {
              let exercises = training.toObject().exercises.map((e) => {
                return { ...e, video: "", how: "", tips: "", mistakes: "" };
                // e.video = "";
                // e.how = "";
                // e.tips = "";
                // e.mistakes = "";
                // return e;
              });
              return res.json({
                success: true,
                result: { ...training.toObject(), exercises: exercises },
                subscribed: req.user.subscribed,
              });
            }
          }
        });
    } catch (e) {
      console.log("error in load trainings by id", err);
      return res.json({
        success: false,
        error: e,
      });
    }
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
  setExerciseDescription: function (req, res) {
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
          "exercises.$.description": req.body.description,
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
