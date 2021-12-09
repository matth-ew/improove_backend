import express from "express";
import actions from "../methods/actions";
import actionsTraining from "../methods/training";
import actionsUser from "../methods/user";
import { loggedIn, loggedInSubscribed } from "../methods/utils";
import passport from "passport";
import multer from "multer";
import logger from "morgan";
import { nodeEnv } from "../config/config";

const router = express.Router();

if (nodeEnv === "development") {
  router.use(logger("dev"));
} else {
  router.use(logger("tiny"));
}

router.get("/", (req, res) => {
  res.send("Hello Improove API");
});

router.post("/adduser", actions.addNew);
router.post("/verifyuser", loggedIn, actions.verifyUser);
router.post("/resendverification", loggedIn, actions.resendVerification);
router.post("/authenticate", actions.authenticate);
router.post("/authenticate-facebook", function (req, res, next) {
  passport.authenticate("facebook-token", function (err, user, profile) {
    actions.authenticateFacebook(req, res, user, profile);
  })(req, res, next);
});
router.post("/authenticate-google", function (req, res, next) {
  passport.authenticate("google-token", function (err, user, profile) {
    actions.authenticateGoogle(req, res, user, profile);
  })(req, res, next);
});

router.post("/redirect-apple", actions.callbackApple);
router.post("/authenticate-apple", function (req, res, next) {
  const appleStrategy = req.body.useBundleId
    ? "apple-token"
    : "apple-web-token";
  passport.authenticate(appleStrategy, function (err, user, profile) {
    actions.authenticateApple(req, res, user, profile);
  })(req, res, next);
});

router.post("/getTrainings", actionsTraining.getTrainings);
router.post("/getTrainingById", loggedIn, actionsTraining.getTrainingById);
router.post("/getTrainerById", actionsUser.getTrainerById);
router.post(
  "/setTrainerDescription",
  loggedIn,
  actionsUser.setTrainerDescription
);
router.post(
  "/setTrainingDescription",
  loggedIn,
  actionsTraining.setTrainingDescription
);
router.post("/setExerciseTips", loggedIn, actionsTraining.setExerciseTips);
router.post("/setExerciseHow", loggedIn, actionsTraining.setExerciseHow);
router.post(
  "/setExerciseMistakes",
  loggedIn,
  actionsTraining.setExerciseMistakes
);
router.get("/getinfo", loggedIn, actionsUser.getinfo);
router.post("/userChangeProfileInfo", loggedIn, actionsUser.changeInfo);
router.post(
  "/userChangeProfileImage",
  loggedIn,
  multer().single("image"),
  actionsUser.changeProfileImage
);
router.post(
  "/userChangeTrainerImage",
  loggedIn,
  multer().single("image"),
  actionsUser.changeTrainerImage
);
router.post("/userAddSavedTraining", loggedIn, actionsUser.saveTraining);
router.post("/userSendFeedback", loggedIn, actionsUser.sendFeedback);
router.post("/userDeleteSavedTraining", loggedIn, actionsUser.removeTraining);

export default router;
