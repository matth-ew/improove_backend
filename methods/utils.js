import https from "https";
import S3 from "aws-sdk/clients/s3";
import uuid from "uuid"; // generate random strings
import { s3AccessId, s3SecretKey } from "../config/config";
import passport from "passport";

var s3 = new S3({
  accessKeyId: s3AccessId,
  secretAccessKey: s3SecretKey,
  region: "eu-west-1",
});

export function saveUrlImageToS3(url, { bucket, key, type }, callback) {
  if (url) {
    https.get(url, function (response) {
      response.on("error", callback);
      const params = {
        Bucket: bucket,
        Key: key + "-" + uuid() + "." + type, // type is not required
        Body: response,
        ACL: "public-read",
        CacheControl: "max-age=31536000",
      };
      var options = { partSize: 10 * 1024 * 1024, queueSize: 1 };
      s3.upload(params, options, callback);
    });
  } else {
    callback();
  }
}

export function loggedIn(req, res, next) {
  passport.authenticate("jwt", function (err, user) {
    actions.getinfo(req, res, user);
    if (user) next();
    else
      return res.status(401).json({
        success: false,
      });
  })(req, res, next);
}
