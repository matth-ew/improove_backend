"use strict";
require("dotenv").config();
const env = process.env;

export const nodeEnv = env.NODE_ENV || "development";
export const mongoUri = env.MONGO_URI;
export const facebookId = env.FACEBOOK_ID;
export const facebookSecret = env.FACEBOOK_SECRET;
export const googleId = env.GOOGLE_ID;
export const googleSecret = env.GOOGLE_SECRET;
export const googlePlayPubsubBillingTopic =
  env.GOOGLE_PLAY_PUBSUB_BILLING_TOPIC || "play_billing";
export const googleProjectId = "improove-d2cb1";
export const androidPackageId = env.ANDROID_PACKAGE_IDENTIFIER;
export const appleTeam = env.APPLE_TEAM;
export const appleId = env.APPLE_ID;
export const appleSecret = env.APPLE_SECRET;
export const appleBundleId = env.APPLE_BUNDLE_ID || "fit.improove.app";
export const appleServiceId = env.APPLE_SERVICE_ID || "fit.improove";
export const appleStoreSharedSecret = env.APPLE_STORE_SHARED_SECRET;
export const s3AccessId = env.S3_ID;
export const s3SecretKey = env.S3_SECRET;
export const bucket_user = env.BUCKET_USER || "improove-user-media";
export const bucket_train = env.BUCKET_TRAIN || "improove-trainings";
export const apiPort = env.API_PORT || 3001;
export const tokenSecret = env.ACCESS_TOKEN || "banana";
