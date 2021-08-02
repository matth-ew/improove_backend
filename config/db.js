import mongoose from "mongoose";

import { mongoUri } from "./config";
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
    });
  } catch (err) {}
};
