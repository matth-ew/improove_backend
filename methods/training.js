import { Training } from "../models";

var functions = {
  getTraining: function (req, res) {
    const id = req.body.id;
    let query = Training.findById(id);
    query.exec((err, training) => {
      if (err) {
        console.log(err);
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

export default functions;
