import { User } from "../models";
import { saveImageToS3, deleteFromS3 } from "./utils";
import { bucket_user } from "../config/config";

var functions = {
  getinfo: function (req, res) {
    return res.json({ success: true, user: req.user });
  },
  changeImage: function (req, res) {
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
  getTrainerById: function (req, res) {
    let query = User.findOne({ _id: req.body.id });
    query.select("name surname _id profileImage trainerDescription");
    query.exec((err, trainer) => {
      if (err) {
        console.log("error in load trainer by id", err);
        return res.json({
          success: false,
          error: err,
        });
      } else {
        return res.json({
          success: true,
          trainer: trainer,
        });
      }
    });
  },
};

export default functions;
