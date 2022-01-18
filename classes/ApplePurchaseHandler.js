// import { PurchaseHandler } from "./purchase-handler";
import { productDataMap } from "../config/products";
import * as appleReceiptVerify from "node-apple-receipt-verify";
import { appleStoreSharedSecret } from "../config/config";
// import { IapRepository } from "./iap.repository";
// import * as Functions from "firebase-functions";
// import camelCaseKeys from "camelcase-keys";
import { groupBy } from "lodash";

// // Add typings for missing property in library interface.
// declare module "node-apple-receipt-verify" {
//   interface PurchasedProducts {
//     originalTransactionId: string;
//   }
// }

// const functions = Functions.region(CLOUD_REGION);

export class ApplePurchaseHandler {
  constructor() {
    appleReceiptVerify.config({
      verbose: false,
      secret: appleStoreSharedSecret,
      extended: true,
      environment: ["sandbox"], // Optional, defaults to ['production'],
      excludeOldTransactions: true,
    });
  }

  async handleNonSubscription(userId, productData, token) {
    return this.handleValidation(userId, token);
  }

  async handleSubscription(userId, productData, token) {
    return this.handleValidation(userId, token);
  }

  async handleValidation(userId, token) {
    // Validate receipt and fetch the products
    let products;
    try {
      products = await appleReceiptVerify.validate({ receipt: token });
    } catch (e) {
      if (e instanceof appleReceiptVerify.EmptyError) {
        // Receipt is valid but it is now empty.
        console.warn("Received valid empty receipt");
        return true;
      } else if (e instanceof appleReceiptVerify.ServiceUnavailableError) {
        console.warn("App store is currently unavailable, could not validate");
        // Handle app store services not being available
        return false;
      }
      return false;
    }
    // Process the received products
    for (const product of products) {
      // Skip processing the product if it is unknown
      const productData = productDataMap[product.productId];
      if (!productData) continue;
      // Process the product
      let purchaseData;
      switch (productData.type) {
        case "SUBSCRIPTION":
          purchaseData = {
            type: productData.type,
            iapSource: "app_store",
            orderId: product.originalTransactionId,
            productId: product.productId,
            userId,
            purchaseDate: product.purchaseDate,
            expiryDate: product.expirationDate ?? 0,
            status:
              (product.expirationDate ?? 0) <= Date.now()
                ? "EXPIRED"
                : "ACTIVE",
          };
          // await this.iapRepository.createOrUpdatePurchase({
          // type: productData.type,
          // iapSource: "app_store",
          // orderId: product.originalTransactionId,
          // productId: product.productId,
          // userId,
          // purchaseDate: product.purchaseDate,
          // expiryDate:
          //   product.expirationDate ?? 0,
          // status:
          //   (product.expirationDate ?? 0) <= Date.now()
          //     ? "EXPIRED"
          //     : "ACTIVE",
          // });
          break;
        case "NON_SUBSCRIPTION":
          purchaseData = {
            type: productData.type,
            iapSource: "app_store",
            orderId: product.originalTransactionId,
            productId: product.productId,
            userId,
            purchaseDate: product.purchaseDate,
            status: "COMPLETED",
          };
          // await this.iapRepository.createOrUpdatePurchase({
          //   type: productData.type,
          //   iapSource: "app_store",
          //   orderId: product.originalTransactionId,
          //   productId: product.productId,
          //   userId,
          //   purchaseDate: product.purchaseDate,
          //   status: "COMPLETED",
          // });
          break;
      }
    }
    return purchaseData;
  }

  //   handleServerEvent = functions.https.onRequest(async (req, res) => {
  //     // eslint-disable-next-line @typescript-eslint/no-var-requires
  //     // type ReceiptInfo = {
  //     //   productId: string;
  //     //   expiresDateMs: string;
  //     //   originalTransactionId: string;
  //     // };
  //     // const eventData: {
  //     //   notificationType: "CANCEL" | "DID_CHANGE_RENEWAL_PREF" | "DID_CHANGE_RENEWAL_STATUS" | "DID_FAIL_TO_RENEW" | "DID_RECOVER" | "DID_RENEW" | "INITIAL_BUY" | "INTERACTIVE_RENEWAL" | "PRICE_INCREASE_CONSENT" | "REFUND" | "REVOKE";
  //     //   password: string;
  //     //   environment: "Sandbox" | "PROD",
  //     //   unifiedReceipt: {
  //     //     "environment": "Sandbox" | "Production",
  //     //     latestReceiptInfo: Array<ReceiptInfo>,
  //     //   };
  //     // } = camelCaseKeys(req.body, {deep: true});
  //     const eventData = camelCaseKeys(req.body, { deep: true });
  //     // Decline events where the password does not match the shared secret
  //     if (eventData.password !== appleStoreSharedSecret) {
  //       res.sendStatus(403);
  //       return;
  //     }
  //     // Only process events where expiration changes are likely to occur
  //     if (
  //       ![
  //         "CANCEL",
  //         "DID_RENEW",
  //         "DID_FAIL_TO_RENEW",
  //         "DID_CHANGE_RENEWAL_STATUS",
  //         "INITIAL_BUY",
  //         "INTERACTIVE_RENEWAL",
  //         "REFUND",
  //         "REVOKE",
  //       ].includes(eventData.notificationType)
  //     ) {
  //       res.sendStatus(200);
  //       return;
  //     }
  //     // Find latest receipt for each original transaction
  //     const latestReceipts = Object.values(
  //       groupBy(
  //         eventData.unifiedReceipt.latestReceiptInfo,
  //         "originalTransactionId"
  //       )
  //     ).map((group) =>
  //       group.reduce((acc, e) =>
  //         !acc || e.expiresDateMs >= acc.expiresDateMs ? e : acc
  //       )
  //     );
  //     // Process receipt items
  //     for (const iap of latestReceipts) {
  //       const productData = productDataMap[iap.productId];
  //       // Skip products that are unknown
  //       if (!productData) continue;
  //       // Update products in firestore
  //       switch (productData.type) {
  //         case "SUBSCRIPTION":
  //           try {
  //             // await this.iapRepository.updatePurchase({
  //             //   iapSource: "app_store",
  //             //   orderId: iap.originalTransactionId,
  //             //   expiryDate: parseInt(iap.expiresDateMs, 10),
  //             //   status:
  //             //     Date.now() >= parseInt(iap.expiresDateMs, 10)
  //             //       ? "EXPIRED"
  //             //       : "ACTIVE",
  //             // });
  //           } catch (e) {
  //             console.log("Could not patch purchase", {
  //               originalTransactionId: iap.originalTransactionId,
  //               productId: iap.productId,
  //             });
  //           }
  //           break;
  //         case "NON_SUBSCRIPTION":
  //           // Nothing to update yet about non-subscription purchases
  //           break;
  //       }
  //     }
  //     res.status(200).send();
  //   });
}
