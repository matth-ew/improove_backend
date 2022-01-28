import mongoose from "mongoose";
const Schema = mongoose.Schema;

const PurchasesSchema = new Schema(
  {
    user_id: { type: Number, ref: "User" },
    type: { type: String, default: "" },
    iapSource: { type: String, default: "" },
    orderId: { type: String, default: "" },
    productId: { type: String, default: "" },
    purchaseDate: Date,
    expirationDate: Date,
    status: { type: String, default: "" },
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

// export our module to use in server.js
export default mongoose.model("Purchase", PurchasesSchema, "Purchases");
