import express from "express";
import bodyParser from "body-parser";
import passport from "passport";
// import logger from "morgan";
import cors from "cors";
// import uuid from "uuid";
import compression from "compression";
import helmet from "helmet"; // security properties
import path from "path";
import actionsPayment from "./methods/payment";
import credentials from "./config/credentials.json";
import { GoogleAuth } from "google-auth-library";

import {
  // allowedOrigins,
  apiPort,
  googleProjectId,
  googlePlayPubsubBillingTopic,
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

/* PARTE PUBSUB GOOGLE PAYMENTS */

const { PubSub } = require("@google-cloud/pubsub");

const pubsub = new PubSub({
  projectId: googleProjectId,
  auth: new GoogleAuth({
    credentials,
  }),
});
const subscription = pubsub.subscription(googlePlayPubsubBillingTopic + "-sub");
subscription.on("message", async (message) => {
  console.log("UE MESSAGE!");
  message.ack();
  try {
    await actionsPayment.googlePaymentEventCallback(message);
  } catch (e) {}
});

// // Receive callbacks for errors on the subscription
subscription.on("error", (error) => {
  console.error("Received error:", error);
});

// (async () => {
//   try {
//     console.log("UEUE UAJO");
//     const [subscription] = await pubsub.createSubscription(
//       googlePlayPubsubBillingTopic,
//       googlePlayPubsubBillingTopic + "-sub"
//     );

//     // Receive callbacks for new messages on the subscription
//     subscription.on("message", (message) => {
//       console.log("UE MESSAGE!");
//       actionsPayment.googlePaymentEventCallback(message);
//     });

//     // // Receive callbacks for errors on the subscription
//     subscription.on("error", (error) => {
//       console.error("Received error:", error);
//     });
//   } catch (e) {
//     // Deal with the fact the chain failed
//   }
// })();

/* PARTE SITO STATICO */

app.use(function (req, res, next) {
  res.setHeader(
    "Content-Security-Policy",
    "script-src 'self' https://youtube.com"
  );
  return next();
});

app.get("/*", express.static("www"));

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
