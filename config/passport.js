import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import FacebookStrategy from "passport-facebook-token";
import GoogleTokenStrategy from "./google_strategy";
import { User } from "../models";
import {
  tokenSecret,
  facebookId,
  facebookSecret,
  googleId,
  googleSecret,
} from "./config";

const jwtStrategy = new JwtStrategy(
  {
    secretOrKey: tokenSecret,
    jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("Bearer"),
  },
  function (payload, done) {
    User.findById(payload.sub, function (err, user) {
      if (err) {
        return done(err, false);
      }
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    });
  }
);

const facebookStrategy = new FacebookStrategy(
  {
    clientID: facebookId,
    clientSecret: facebookSecret,
    profileFields: [
      "id",
      "birthday",
      "displayName",
      "gender",
      "emails",
      "picture",
      "name",
    ],
    fbGraphVersion: "v7.0",
  },
  function (accessToken, refreshToken, profile, done) {
    User.findOne({ facebookId: profile.id }, function (err, user) {
      done(err, user, profile);
    });
  }
);

const googleStrategy = new GoogleTokenStrategy(
  {
    clientID: googleId,
    clientSecret: googleSecret,
  },
  function (token, tokenSecret, profile, done) {
    User.findOne({ googleId: profile.id }, function (err, user) {
      done(err, user, profile);
    });
  }
);

export default function (passport) {
  passport.use(jwtStrategy);
  passport.use("facebook-token", facebookStrategy);
  passport.use("google-token", googleStrategy);
}
