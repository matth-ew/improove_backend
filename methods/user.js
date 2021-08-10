import { User } from "../models";

var functions = {
  getinfo: function (req, res) {
    return res.json({ success: true, user: req.user });
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
