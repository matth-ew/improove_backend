import { Training } from "../models";
import { saveUrlImageToS3 } from "../config/utils";
import { bucket_user } from "../config/config";

var functions = {
  getTraining: function (req, res) {
    id = req.id;
    let query = Training.find();
    query.where((id = id));
    query.exec((err, training) => {
      if (err) {
        //console.log(err)
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
};
