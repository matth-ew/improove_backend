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
};

export default functions;
