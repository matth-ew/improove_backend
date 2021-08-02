"use strict";
require("dotenv").config();
const env = process.env;

export const nodeEnv = env.NODE_ENV || "development";
export const mongoUri = env.MONGO_URI;
export const facebookId = env.FACEBOOK_ID;
export const facebookSecret = env.FACEBOOK_SECRET;
export const googleId = env.GOOGLE_ID;
export const googleSecret = env.GOOGLE_SECRET;
export const s3AccessId = process.env.S3_ID;
export const s3SecretKey = process.env.S3_SECRET;
export const bucket_user = process.env.BUCKET_USER || "improove-user-media";
export const bucket_train = process.env.BUCKET_TRAIN || "improove-train-media";
export const apiPort = env.API_PORT || 3001;
export const tokenSecret = env.ACCESS_TOKEN || "banana";
