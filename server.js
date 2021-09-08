import express from "express";
import bodyParser from "body-parser";
import passport from "passport";
// import logger from "morgan";
import cors from "cors";
// import uuid from "uuid";
import compression from "compression";
import helmet from "helmet"; // security properties
import path from "path";

import {
  // allowedOrigins,
  apiPort,
} from "./config/config";

import { connectDB } from "./config/db";
import router from "./routes";
import myPassport from "./config/passport";

connectDB();

const app = express();
app.use(compression());
app.use(helmet());

// var corsOption = {
//   origin: function (origin, callback) {
//     if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   methods: "OPTION,GET,HEAD,PUT,PATCH,POST,DELETE",
//   credentials: true,
//   exposedHeaders: [
//     "Origin, X-Requested-With, Content-Type, Accept, Authorization",
//   ],
// };
// app.use(cors(corsOption));
app.use(cors());

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
app.use("/api", router);
app.use(passport.initialize());
myPassport(passport);

// app.get("/", function (req, res) {
//   res.sendFile(path.join(__dirname, "/index.html"));
// });
app.get("/privacy", function (req, res) {
  res.sendFile(path.join(__dirname, "www/privacy.html"));
});
app.get("/terms", function (req, res) {
  res.sendFile(path.join(__dirname, "www/terms.html"));
});

// if (nodeEnv === "development") {
//   router.use(logger("dev"));
// } else {
//   router.use(logger("tiny"));
// }

// if (nodeEnv === "development") {
//   app.use(logger("dev"));
// } else {
//   app.use(logger("tiny"));
// }

app.listen(apiPort, () => console.log(`Listening on port ${apiPort}`));
