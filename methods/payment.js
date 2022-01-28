import { User } from "../models";
import { ApplePurchaseHandler } from "../classes/ApplePurchaseHandler";
import { GooglePurchaseHandler } from "../classes/GooglePurchaseHandler";
import { productDataMap } from "../config/products";

const purchaseHandlers = {
  google_play: new GooglePurchaseHandler(),
  app_store: new ApplePurchaseHandler(),
};

var functions = {
  validateSubscription: async function (req, res) {
    console.log("UE VALIDATE");
    const { source, verificationData, productId } = req.body;
    const productData = productDataMap[productId];
    // If it was for an unknown source, do not process it.
    if (!purchaseHandlers[source]) {
      console.warn(`verifyPurchase called for an unknown source ("${source}")`);
      return res.json({ success: false, msg: "Not valid payment source" });
    }
    // Process the purchase for the product
    purchaseHandlers[source].handleSubscription(
      req.user._id,
      productData,
      verificationData,
      (response) => {
        if (response == null || response == false) {
          return res.json({ success: false, msg: "Not valid payment" });
        } else {
          return res.json({ success: true });
        }
      }
    );
    // console.log("UE PURCHASE DATA");
    // console.log(purchaseData);
    // if (purchaseData == null || purchaseData == false) {
    //   return res.json({ success: false, msg: "Not valid payment" });
    // } else {
    //   return res.json({ success: true });
    //   // let { status } = purchaseData;
    //   // if (status == "ACTIVE" || status == "EXPIRED") {
    //   //   let query = User.updateOne(
    //   //     { _id: req.user.id },
    //   //     {
    //   //       subscribed: status == "ACTIVE" ? true : false,
    //   //     }
    //   //   );
    //   //   query.exec((err /*, mongo_res*/) => {
    //   //     if (err)
    //   //       return res.json({
    //   //         success: false,
    //   //         error: err,
    //   //       });
    //   //     else return res.json({ success: true });
    //   //   });
    //   // } else {
    //   //   return res.json({ success: true, status: purchaseData.status });
    //   // }
    // }
  },
  applePaymentEventCallback: async function (req, res) {
    let result = await purchaseHandlers.app_store.handleServerEvent(req, res);
    if (result == 403) {
      res.sendStatus(403);
    } else {
      res.sendStatus(200);
    }
  },
  googlePaymentEventCallback: async function (message) {
    return await purchaseHandlers.google_play.handleServerEvent(message);
  },
};

export default functions;
