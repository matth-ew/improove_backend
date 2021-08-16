import express from "express";
import actions from "../methods/actions";
import actionsTraining from "../methods/training";
import actionsUser from "../methods/user";
import { loggedIn } from "../methods/utils";
import passport from "passport";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello Improove API");
});

router.post("/adduser", actions.addNew);
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
router.post("/getTrainings", actionsTraining.getTrainings);
router.post("/getTrainingById", actionsTraining.getTrainingById);
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
router.post("/userAddSavedTraining", loggedIn, actionsUser.saveTraining);
router.post("/userDeleteSavedTraining", loggedIn, actionsUser.removeTraining);

export default router;
