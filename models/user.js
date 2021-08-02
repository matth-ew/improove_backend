import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { nodeEnv, tokenSecret } from "../config/config";
import jwt from "jsonwebtoken";
const Schema = mongoose.Schema;

const UsersSchema = new Schema(
  {
    name: { type: String, default: "" },
    surname: { type: String, default: "" },
    password: { type: String, default: "", select: false },
    testPass: { type: String, select: false },
    terms: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
    email: { type: String, default: "" },
    birth: { type: Number, default: -1 },
    gender: { type: String, default: "" },
    googleId: String,
    facebookId: String,
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

UsersSchema.methods = {
  comparePassword: function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
      if (err) return cb(err);
      cb(err, isMatch);
    });
  },

  hashPassword: (plainTextPassword) => {
    return bcrypt.hashSync(plainTextPassword, 10);
  },
  compareToken: function (candidateToken, cb) {
    cb(null, candidateToken === this.verifyKey);
  },
  issueJWT: function () {
    const payload = {
      sub: this._id,
      iat: Date.now(),
    };
    const expiresIn = "30 days";

    const signedToken = jwt.sign(payload, tokenSecret, { expiresIn });

    return {
      token: "Bearer " + signedToken,
      expires: expiresIn,
    };
  },
};

// UsersSchema.pre("save", function (next) {
//   var doc = this;
//   if (this._id > 0) {
//     //console.log("in pre-save");
//     return next();
//   }

//   Counter.findByIdAndUpdate(
//     { _id: "entityId" },
//     { $inc: { seq: 1 } },
//     { new: true, upsert: true }
//   )
//     .then(function (counter, error) {
//       if (error) {
//         return next(error);
//       }
//       doc._id = counter.seq;
//       //console.log("CONTEGGIO",counter.seq);
//       //next();
//     })
//     .catch(function (error) {
//       console.error("counter error-> : " + error);
//       throw error;
//     })
//     .then(function () {
//       next();
//     });
// });

UsersSchema.pre("save", function (next) {
  var doc = this;
  if (!doc.isModified("password")) return next();
  if (nodeEnv === "development") {
    doc.testPass = doc.password;
  }
  doc.password = doc.hashPassword(doc.password);
  doc.resetPasswordToken = undefined;
  doc.resetPasswordExpires = undefined;
  next();
});

// export our module to use in server.js
export default mongoose.model("User", UsersSchema, "Users");
