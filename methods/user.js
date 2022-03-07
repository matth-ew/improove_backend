import { User, Training, Feedback, Purchase } from "../models";
import { saveImageToS3, deleteFromS3 } from "./utils";
import { bucket_user } from "../config/config";
import async from "async";

var functions = {
  getinfo: function (req, res) {
    const { user } = req;
    if (req.user.subscribed) {
      async.waterfall(
        [
          function (done) {
            console.log("SUBSCRIBED", user._id);
            Purchase.findOne({ user_id: user._id, status: "ACTIVE" })
              .sort({ expirationDate: -1 })
              .exec((err, purchase) => {
                done(err, purchase);
              });
          },
          function (purchase, done) {
            if (purchase) {
              console.log(
                "SUBSCRIBED LAST PURCH",
                purchase,
                purchase.expirationDate < Date.now()
              );
              if (purchase.expirationDate < Date.now()) {
                Purchase.updateOne(
                  { _id: purchase._id },
                  { status: "EXPIRED" }
                ).exec((err) => done(err, true));
              } else {
                done(null, false);
              }
            } else {
              done(null, true);
            }
          },
          function (expired, done) {
            if (expired) {
              console.log("SUBSCRIBED EXPIRED?", expired);
              User.updateOne(
                { _id: user._id },
                {
                  subscribed: false,
                }
              ).exec((err) => done(err, true));
            } else {
              done(null, expired);
            }
          },
        ],
        function (err, expired) {
          if (err) res.json({ success: true, user });
          else
            res.json({
              success: true,
              user: { ...user.toObject(), subscribed: !expired },
            });
        }
      );
    } else {
      return res.json({ success: true, user });
    }
  },
  changeTrainerImage: function (req, res) {
    console.log("REQ.FILE", req.file);
    saveImageToS3(
      req.file.buffer,
      {
        bucket: bucket_user,
        key: req.user.id,
        type: req.file.originalname.split(".")[1],
      },
      (err, response) => {
        if (err) {
          return res.json({ success: false, error: err });
        } else if (response) {
          let query = User.updateOne(
            { _id: req.user.id },
            {
              trainerImage: response.Location,
            }
          );
          query.exec((err2) => {
            if (err2)
              return res.json({
                success: false,
                error: err2,
              });
            else {
              var key = req.user.trainerImage.split("/");
              deleteFromS3(
                { bucket: bucket_user, key: key[key.length - 1] },
                (err, data) => {
                  console.log("DELETE", req.user.trainerImage, err, data);
                }
              );
              return res.json({ success: true, image: response.Location });
            }
          });
        }
      }
    );
  },
  changeInfo: function (req, res) {
    let query = User.updateOne(
      { _id: req.user.id },
      {
        name: req.body.name,
        surname: req.body.surname,
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
  changeProfileImage: function (req, res) {
    console.log("REQ.FILE", req.file);
    saveImageToS3(
      req.file.buffer,
      {
        bucket: bucket_user,
        key: req.user.id,
        type: req.file.originalname.split(".")[1],
      },
      (err, response) => {
        if (err) {
          return res.json({ success: false, error: err });
        } else if (response) {
          let query = User.updateOne(
            { _id: req.user.id },
            {
              profileImage: response.Location,
            }
          );
          query.exec((err2) => {
            if (err2)
              return res.json({
                success: false,
                error: err2,
              });
            else {
              var key = req.user.profileImage.split("/");
              deleteFromS3(
                { bucket: bucket_user, key: key[key.length - 1] },
                (err, data) => {
                  console.log("DELETE", req.user.profileImage, err, data);
                }
              );
              return res.json({ success: true, image: response.Location });
            }
          });
        }
      }
    );
  },
  sendFeedback: function (req, res) {
    var feedback = new Feedback();
    feedback.user_id = req.user.id;
    feedback.text = req.body.text;
    feedback.save(function (err, feedback) {
      if (err) {
        res.json({ success: false, msg: "Failed to save" });
      } else {
        res.json({
          success: true,
          msg: "Successfully saved",
        });
      }
    });
  },
  saveTraining: function (req, res) {
    let query = User.updateOne(
      { _id: req.user.id },
      {
        $push: {
          savedTrainings: { trainingId: req.body.trainingId },
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
  removeTraining: function (req, res) {
    let query = User.updateOne(
      { _id: req.user.id },
      {
        $pull: {
          savedTrainings: { trainingId: req.body.trainingId },
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
  setTrainerDescription: function (req, res) {
    console.log("set ", req.user._id, req.body.id);
    if (req.user._id == req.body.id) {
      let query = User.updateOne(
        { _id: req.body.id },
        {
          $set: {
            trainerDescription: req.body.text,
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
    } else {
      return res.json({
        success: false,
        error: "user not valid",
      });
    }
  },
  getAvatars: function (ids) {
    let query = User.where("_id").in(ids);
    query.select("_id, profileImage");
    query.exec((err, users) => {
      if (err) {
        console.log(err);
        return res.json({
          success: false,
          error: err,
        });
      } else {
        return res.json({
          success: true,
          avatars: users,
        });
      }
    });
  },
  // getTrainerById: function (req, res) {
  //   let query = User.findOne({ _id: req.body.id });
  //   query.select("name surname _id profileImage trainerDescription");
  //   query.exec((err, trainer) => {
  //     if (err) {
  //       console.log("error in load trainer by id", err);
  //       return res.json({
  //         success: false,
  //         error: err,
  //       });
  //     } else {
  //       return res.json({
  //         success: true,
  //         trainer: trainer,
  //       });
  //     }
  //   });
  // },

  getLatestTrainers: function (req, res) {
    let query = User.find({ trainer: true }).sort({ createdAt: -1 }).limit(6);
    query.select(
      "name surname _id profileImage trainerDescription trainerImage"
    );
    query.exec((err, trainers) => {
      if (err) {
        console.log("error in load trainer by id", err);
        return res.json({
          success: false,
          error: err,
        });
      } else {
        console.log("TRAINERS", trainers);
        return res.json({
          success: true,
          trainers: trainers,
        });
      }
    });
  },

  getTrainerById: function (req, res) {
    async.waterfall(
      [
        function (done) {
          let query = User.findOne({ _id: req.body.id });
          query.select(
            "name surname _id profileImage trainerDescription trainerImage"
          );
          query.exec((err, trainer) => {
            if (err) {
              console.log("error in load trainer by id", err);
              done(err, trainer);
            } else {
              done(null, trainer);
            }
          });
        },
        function (trainer, done) {
          if (trainer) {
            let query = Training.find({});
            query.where("trainer_id").equals(trainer._id);
            query.select("title preview category");
            query.exec((err, trainings) => {
              if (err) {
                console.log(err);
                return res.json({
                  success: false,
                  error: err,
                });
              } else {
                return res.json({
                  success: true,
                  trainer: trainer,
                  trainings: trainings,
                });
              }
            });
          } else done(err);
        },
      ],
      function (err) {
        return res.json({
          success: false,
          error: err,
        });
      }
    );
  },
};

export default functions;
