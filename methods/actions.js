import { User } from "../models";
import { sendActivationMail, saveUrlImageToS3 } from "./utils";
import { bucket_user, androidPackageId } from "../config/config";
import { randomInt } from "crypto";
import async from "async";

var functions = {
  addNew: function (req, res) {
    if (!req.body.email || !req.body.password) {
      res.status(401).json({ success: false, msg: "Enter all fields" });
    } else {
      User.findOne(
        { email: req.body.email.toLowerCase() },
        function (err, user) {
          if (user || err) {
            res
              .status(401)
              .json({ success: false, msg: "Email already in use" });
          } else {
            let verifyKey = randomInt(10000, 100000);
            var newUser = User({
              email: req.body.email.toLowerCase(),
              password: req.body.password,
              active: false,
              verifyKey: verifyKey,
            });
            newUser.save(function (err, user) {
              if (err) {
                res.json({ success: false, msg: "Failed to save" });
              } else {
                sendActivationMail(
                  {
                    to_mail: user.email,
                    // name: user.name,
                    token: verifyKey,
                  },
                  (/*res, err*/) => {}
                );
                const jwt = user.issueJWT();
                res.json({
                  success: true,
                  user: user,
                  token: jwt.token,
                  expiresIn: jwt.expiresIn,
                  msg: "Successfully saved",
                });
              }
            });
          }
        }
      );
    }
  },
  verifyUser: function (req, res) {
    User.findOne({ _id: req.user._id })
      .select("+verifyKey")
      .exec((err, user) => {
        user.compareToken(req.body.verifyToken, (err, isMatch) => {
          if (isMatch) {
            console.log("match");
            user.active = true;
            user.save();
            res.json({ success: true });
          } else res.json({ success: false, msg: "invalid code" });
        });
      });
  },
  resendVerification: function (req, res) {
    async.waterfall(
      [
        function (done) {
          let verifyKey = randomInt(10000, 100000);
          let query = User.updateOne(
            { _id: req.user._id },
            {
              $set: {
                verifyKey: verifyKey,
              },
            }
          );
          query.exec((err /*, mongo_res*/) => {
            done(err, verifyKey);
            // if (err)
            //   return res.json({
            //     success: false,
            //     error: err,
            //     msg: "Failed to save",
            //   });
            // else {
            //   //TODO: MAIL WITH CODE
            //   console.log("UE VERIFY", verifyKey);

            //   return res.json({ success: true });
            // }
          });
        },
        function (verifyKey, done) {
          sendActivationMail(
            {
              to_mail: req.user.email,
              // name: req.user.name,
              token: verifyKey,
            },
            (res, err) => done(err, "done")
          );
        },
      ],
      function (err) {
        if (err)
          return res.json({
            success: false,
            error: err,
          });
        else
          return res.json({
            success: true,
          });
      }
    );
  },
  authenticate: function (req, res, next) {
    User.findOne({ email: req.body.email.toLowerCase() })
      .select("+password")
      .exec((err, user) => {
        if (err) next(err);
        if (!user)
          res.status(401).send({
            success: false,
            msg: "Authentication Failed, account not found",
          });
        else {
          user.comparePassword(req.body.password, function (err, isMatch) {
            if (isMatch && !err && req.body.password.length > 0) {
              const jwt = user.issueJWT();
              res.status(200).json({
                success: true,
                user: user,
                token: jwt.token,
                expiresIn: jwt.expiresIn,
              });
            } else {
              let msg = "";
              if (user.googleId) {
                msg = "Authentication failed, try with Google Login";
              } else if (user.appleId) {
                msg = "Authentication failed, try with Apple Login";
              } else if (user.facebookId) {
                msg = "Authentication failed, try with Facebook Login";
              } else {
                msg = "Authentication failed, wrong password";
              }
              res.status(403).send({
                success: false,
                msg: msg,
              });
            }
          });
        }
      });
  },
  token: function (req, res) {
    // Logica con Refresh Token?
  },
  authenticateFacebook: function (req, res, user, profile) {
    // console.log("FACEBOOK AUTH", user, profile);
    if (user) {
      const jwt = user.issueJWT();
      res.status(200).json({
        success: true,
        user: user,
        token: jwt.token,
        expiresIn: jwt.expiresIn,
      });
    } else if (profile) {
      let newUser = new User();
      const birthday = profile._json.birthday;
      newUser.facebookId = profile.id;
      newUser.name = profile.name.givenName;
      newUser.surname = profile.name.familyName;
      // newUser.password = accessToken;
      newUser.email = profile.emails[0].value;
      newUser.active = true;
      newUser.terms = false;
      newUser.profileImage = profile.photos[0].value;
      switch (profile.gender) {
        case "male":
          newUser.gender = "m";
          break;
        case "female":
          newUser.gender = "f";
          break;
        default:
          newUser.gender = "";
      }
      if (birthday) {
        newUser.birth =
          birthday.substr(6, 4) +
          "" +
          birthday.substr(0, 2) +
          "" +
          birthday.substr(3, 2); // da MM/DD/YYYY a YYYYMMDD
      }

      newUser.save(function (err, user) {
        if (err) {
          res.json({ success: false, msg: "Failed to save " + err });
        } else {
          const jwt = user.issueJWT();
          res.status(200).json({
            success: true,
            user: user,
            token: jwt.token,
            expiresIn: jwt.expiresIn,
            msg: "Successfully saved",
          });
        }
      });
    } else {
      res.status(403).send({
        success: false,
        msg: "Authentication failed",
      });
    }
  },
  callbackApple: function (req, res) {
    const redirect = `intent://callback?${new URLSearchParams(
      req.body
    ).toString()}#Intent;package=${androidPackageId};scheme=signinwithapple;end`;

    console.log(`Redirecting to ${redirect}`);

    res.redirect(307, redirect);
  },
  authenticateApple: function (req, res, user, profile) {
    // console.log("APPLE AUTH", user, profile);
    if (user) {
      const jwt = user.issueJWT();
      res.status(200).json({
        success: true,
        user: user,
        token: jwt.token,
        expiresIn: jwt.expiresIn,
      });
    } else if (profile) {
      let newUser = new User();
      const { id, name, email } = profile;

      //const birthday = profile._json.birthday;
      newUser.appleId = id;
      newUser.name = name ? name.firstName : "";
      newUser.surname = name ? name.lastName : "";
      // newUser.password = accessToken;
      newUser.email = email;
      newUser.active = true;
      newUser.terms = false;
      //newUser.profileImage = profile.photos[0].value;
      // switch (profile.gender) {
      //   case "male":
      //     newUser.gender = "m";
      //     break;
      //   case "female":
      //     newUser.gender = "f";
      //     break;
      //   default:
      //     newUser.gender = "";
      // }
      // if (birthday) {
      //   newUser.birth =
      //     birthday.substr(6, 4) +
      //     "" +
      //     birthday.substr(0, 2) +
      //     "" +
      //     birthday.substr(3, 2); // da MM/DD/YYYY a YYYYMMDD
      // }

      newUser.save(function (err, user) {
        if (err) {
          res.json({ success: false, msg: "Failed to save " + err });
        } else {
          const jwt = user.issueJWT();
          res.status(200).json({
            success: true,
            user: user,
            token: jwt.token,
            expiresIn: jwt.expiresIn,
            msg: "Successfully saved",
          });
        }
      });
    } else {
      res.status(403).send({
        success: false,
        msg: "Authentication failed",
      });
    }
  },
  authenticateGoogle: function (req, res, user, profile) {
    // console.log("GOOGLE AUTH", user, profile);
    if (user) {
      const jwt = user.issueJWT();
      res.status(200).json({
        success: true,
        user: user,
        token: jwt.token,
        expiresIn: jwt.expiresIn,
      });
    } else if (profile) {
      saveUrlImageToS3(
        profile.photos[0].value,
        { bucket: bucket_user, key: profile.id, type: "jpeg" },
        (err, response) => {
          let newUser = new User();
          newUser.googleId = profile.id;
          const birthday = profile._json.birthday;
          newUser.name = profile.name.givenName;
          newUser.surname = profile.name.familyName;
          // newUser.password = accessToken;
          newUser.email = profile.emails[0].value;
          newUser.active = true;
          newUser.isNotifMailConfirmed = true;
          newUser.terms = false;
          switch (profile.gender) {
            case "male":
              newUser.gender = "m";
              break;
            case "female":
              newUser.gender = "f";
              break;
            default:
              newUser.gender = "";
          }
          if (birthday)
            newUser.birth =
              birthday.substr(6, 4) +
              "" +
              birthday.substr(0, 2) +
              "" +
              birthday.substr(3, 2); // da MM/DD/YYYY a YYYYMMDD
          if (response) {
            newUser.profileImage = response.Location;
          }

          newUser.save(function (err, user) {
            if (err) {
              res.json({ success: false, msg: "Failed to save" });
            } else {
              const jwt = user.issueJWT();
              res.status(200).json({
                success: true,
                user: user,
                token: jwt.token,
                expiresIn: jwt.expiresIn,
                msg: "Successfully saved",
              });
            }
          });
        }
      );
    } else {
      res.status(403).send({
        success: false,
        msg: "Authentication failed",
      });
    }
  },
};

export default functions;
