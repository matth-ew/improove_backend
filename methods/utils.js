import https from "https";
import S3 from "aws-sdk/clients/s3";
import SES from "aws-sdk/clients/ses";
import { v4 as uuidv4 } from "uuid";
import { s3AccessId, s3SecretKey } from "../config/config";
import passport from "passport";
import sharp from "sharp";

var s3 = new S3({
  accessKeyId: s3AccessId,
  secretAccessKey: s3SecretKey,
  region: "eu-west-1",
});

var ses = new SES({
  accessKeyId: s3AccessId,
  secretAccessKey: s3SecretKey,
  region: "eu-west-1",
  apiVersion: "2010-12-01",
});

export function sendActivationMail({ to_mail, token }, callback) {
  var promise = ses
    .sendTemplatedEmail({
      Source: "Improove <info@improove.fit>" /* required */,
      Destination: {
        ToAddresses: [to_mail],
      },
      ConfigurationSetName: "TransactionalMailConfigSet",
      Template: "ImprooveVerification" /* required */,
      TemplateData: '{ "token":"' + token + '"}',
    })
    .promise();

  promise
    .then((res) => callback(res, null))
    .catch((err) => callback(null, err));
}

export function saveImageToS3(file, { bucket, key, type }, callback) {
  if (file) {
    sharp(file)
      .webp()
      .toBuffer()
      .then((data) => {
        const params = {
          Bucket: bucket,
          Key: key + "-" + uuidv4() + ".webp",
          Body: data,
          ACL: "public-read",
          CacheControl: "max-age=31536000",
        };
        var options = { partSize: 10 * 1024 * 1024, queueSize: 1 };
        s3.upload(params, options, callback);
      })
      .catch((err) => callback(err));
  } else {
    callback();
  }
}

export function deleteFromS3({ bucket, key }, callback) {
  s3.deleteObject({ Bucket: bucket, Key: key }, callback);
}

export function saveUrlImageToS3(url, { bucket, key, type }, callback) {
  if (url) {
    https.get(url, function (response) {
      response.on("error", callback);
      const params = {
        Bucket: bucket,
        Key: key + "-" + uuidv4() + "." + type, // type is not required
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
    if (user) {
      req.user = user;
      next();
    } else
      return res.status(401).json({
        success: false,
        msg: "Not authorized",
      });
  })(req, res, next);
}
