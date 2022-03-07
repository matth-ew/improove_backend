import { Training, General } from "../models";
// import actionsUser from "../methods/user";
import async from "async";
import training from "../models/training";
import { getSignedUrl } from "./utils";
import { bucket_train } from "../config/config";

var functions = {
  createTraining: function (req, res) {
    try {
      var req_t = req.body.training;
      var exercises = req_t.exercises;
      if (exercises.length == 0) {
        return res.json({
          success: false,
          msg: "no exercises",
        });
      }

      async.waterfall(
        [
          function (done) {
            var newTraining = new Training();
            newTraining.approved = false;
            newTraining.trainer_id = req.user._id;
            newTraining.title = req_t.title;
            newTraining.description = req_t.description;
            newTraining.preview = req_t.preview;
            newTraining.category = req_t.category;
            newTraining.save(function (err, training) {
              done(err, training);
            });
          },
          function (training, done) {
            if (!training) {
              done("error training save");
            } else {
              async.map(
                [
                  ...exercises.map((e) => e.video),
                  ...exercises.map((e) => e.preview),
                ],
                (file, eachDone) => {
                  var split = file.split(".");
                  var type = split[split.length - 1];
                  getSignedUrl({
                    key: `${training.id}-${file}`,
                    bucket: bucket_train,
                    type: type == "mp4" ? "video/mp4" : "image/webp",
                  })
                    .then((url) => {
                      if (type == "mp4") {
                        let index = exercises.findIndex((e) => e.video == file);
                        if (index != -1)
                          exercises[index].video = url.split("?")[0];
                      } else {
                        let index = exercises.findIndex(
                          (e) => e.preview == file
                        );
                        if (index != -1)
                          exercises[index].preview = url.split("?")[0];
                      }
                      eachDone(null, {
                        url: url,
                        file: file,
                        key: `${training.id}-${file}`,
                      });
                    })
                    .catch((err) => eachDone(err));
                },
                function (err, results) {
                  done(err, results, training);
                }
              );
            }
          },
          function (urls, training, done) {
            training.exercises = exercises;
            training.preview = exercises[exercises.length - 1].preview;
            training.save(function (err, training) {
              done(err, urls, training);
            });
          },
        ],
        function (err, urls, training) {
          if (err) {
            return res.json({
              success: false,
              error: err,
            });
          } else {
            return res.json({
              success: true,
              urls: urls,
            });
          }
        }
      );
    } catch (e) {
      console.log("error in createTraining", e);
      return res.json({
        success: false,
        error: e,
      });
    }
  },
  getTrainings: function (req, res) {
    try {
      let query = Training.find();
      /* SOLO APPROVATI */
      query.where("approved").ne(false);
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
      console.log("error in load trainings", e);
      return res.json({
        success: false,
        error: e,
      });
    }
  },
  getWeekTraining: function (req, res) {
    try {
      async.waterfall(
        [
          function (done) {
            General.findOne().exec((err, general) => {
              done(err, general);
            });
          },
          function (general, done) {
            if (!general) {
              done("no general");
            } else {
              Training.findOne()
                .where("_id")
                .equals(general.week_training_id)
                .select(
                  "_id title preview category exercises_length exercises.niente"
                )
                .populate({ path: "trainer_id", select: "_id profileImage" })
                .exec((err, training) => {
                  done(err, training);
                });
            }
          },
        ],
        function (err, result) {
          if (err) {
            return res.json({
              success: false,
              error: err,
            });
          } else {
            return res.json({
              success: true,
              training: result,
            });
          }
        }
      );
    } catch (e) {
      console.log("error in load training week", e);
      return res.json({
        success: false,
        error: e,
      });
    }
  },
  getTrainingById: function (req, res) {
    try {
      let query = Training.findOne().where("_id").equals(parseInt(req.body.id));
      query.select(" +exercises.video ");
      query
        .populate({
          path: "trainer_id",
          select: "_id profileImage name surname",
        })
        .exec((err, training) => {
          if (err || !training) {
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
              const training_o = training.toObject();
              let exercises = training_o.exercises.map((e, i) => {
                if (i < training_o.freeExercises) return e;
                else
                  return { ...e, video: "", how: [], tips: [], mistakes: [] };
                // e.video = "";
                // e.how = "";
                // e.tips = "";
                // e.mistakes = "";
                // return e;
              });
              return res.json({
                success: true,
                result: { ...training_o, exercises: exercises },
                subscribed: req.user.subscribed,
              });
            }
          }
        });
    } catch (e) {
      console.log("error in load trainings by id", e);
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
