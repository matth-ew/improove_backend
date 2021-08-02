import express from "express";
import actions from "../methods/actions";
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
router.get("/getinfo", loggedIn, actions.getinfo);

export default router;
