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
    const purchaseData = await purchaseHandlers[source].handleSubscription(
      req.user._id,
      productData,
      verificationData
    );
    if (purchaseData == false) {
      return res.json({ success: false, msg: "Not valid payment" });
    } else if (purchaseData == true) {
    } else {
      if (purchaseData.status == "ACTIVE") {
        let query = User.updateOne(
          { _id: req.user.id },
          {
            subscribed: true,
          }
        );
        query.exec((err /*, mongo_res*/) => {
          if (err)
            return res.json({
              success: false,
              error: err,
            });
          else return res.json({ success: true });
        });
      } else {
        return res.json({ success: true, status: purchaseData.status });
      }
      /// VA AGGIUNTO SU PAYMENTS MODEL?

      // return res.json({ success: true });
    }
  },
};

export default functions;
