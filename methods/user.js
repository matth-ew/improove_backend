import { User } from "../models";

var functions = {
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
    let query = Trainer.where("_id").equals(req.body.id);
    query.select("name surname _id profileImage trainerDescription");
    query.exec((err, training) => {
      if (err) {
        console.log("error in load trainer by id", err);
        return res.json({
          success: false,
          error: err,
        });
      } else {
        return res.json({
          success: false,
          result: trainer,
        });
      }
    });
  },
};

export default functions;
