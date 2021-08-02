import { User } from "../models";
import { saveUrlImageToS3 } from "../config/utils";
import { bucket_user } from "../config/config";

var functions = {
  addNew: function (req, res) {
    if (!req.body.email || !req.body.password) {
      res.status(401).json({ success: false, msg: "Enter all fields" });
    } else {
      User.findOne({ email: req.body.email }, function (err, user) {
        if (user || err) {
          res.status(401).json({ success: false, msg: "Email already in use" });
        } else {
          var newUser = User({
            email: req.body.email,
            password: req.body.password,
          });
          newUser.save(function (err, user) {
            if (err) {
              res.json({ success: false, msg: "Failed to save" });
            } else {
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
      });
    }
  },
  authenticate: function (req, res, next) {
    User.findOne({ email: req.body.email })
      .select("+password")
      .exec((err, user) => {
        if (err) next(err);
        if (!user)
          res.status(401).send({
            success: false,
            msg: "Authentication Failed, User not found",
          });
        else {
          user.comparePassword(req.body.password, function (err, isMatch) {
            if (isMatch && !err) {
              const jwt = user.issueJWT();
              res.status(200).json({
                success: true,
                user: user,
                token: jwt.token,
                expiresIn: jwt.expiresIn,
              });
            } else {
              res.status(403).send({
                success: false,
                msg: "Authentication failed, wrong password",
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
    console.log("FACEBOOK AUTH", user, profile);
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
      newUser.gender = profile.gender == "male" ? "m" : "f";
      newUser.profile_image = profile.photos[0].value
        ? profile.photos[0].value
        : defaultImage;
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
    } else {
      res.status(403).send({
        success: false,
        msg: "Authentication failed",
      });
    }
  },
  authenticateGoogle: function (req, res, user, profile) {
    console.log("GOOGLE AUTH", user, profile);
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
          newUser.mail = profile.emails[0].value;
          newUser.active = true;
          newUser.gender = profile.gender == "male" ? "m" : "f";
          newUser.isNotifMailConfirmed = true;
          newUser.terms = false;
          if (birthday)
            newUser.birth =
              birthday.substr(6, 4) +
              "" +
              birthday.substr(0, 2) +
              "" +
              birthday.substr(3, 2); // da MM/DD/YYYY a YYYYMMDD
          if (response) {
            newUser.profile_image = response.Location;
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
  getinfo: function (req, res, user) {
    console.log("UE GET INFO", user);
    return res.json({ success: true, msg: "Hello " + user.email });
  },
};

export default functions;
