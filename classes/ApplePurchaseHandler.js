// import { PurchaseHandler } from "./purchase-handler";
import { Purchase, User } from "../models";
import { productDataMap } from "../config/products";
import * as appleReceiptVerify from "node-apple-receipt-verify";
import { appleStoreSharedSecret } from "../config/config";
// import { IapRepository } from "./iap.repository";
// import * as Functions from "firebase-functions";
// import camelCaseKeys from "camelcase-keys";
import { groupBy } from "lodash";
import async from "async";

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

    this.handleNonSubscription = this.handleNonSubscription.bind(this);
    this.handleSubscription = this.handleSubscription.bind(this);
    this.handleServerEvent = this.handleServerEvent.bind(this);
  }

  async setUserSubscription(user_id, status) {
    if (status == "ACTIVE" || status == "EXPIRED") {
      return await User.updateOne(
        { _id: user_id },
        {
          subscribed: status == "ACTIVE" ? true : false,
        }
      );
    } else return;
  }

  async handleNonSubscription(user_id, productData, token, callback) {
    return this.handleValidation(user_id, token, callback);
  }

  async handleSubscription(user_id, productData, token, callback) {
    return this.handleValidation(user_id, token, callback);
  }

  async handleValidation(user_id, token, callback) {
    // Validate receipt and fetch the products
    // try {
    //   products = await appleReceiptVerify.validate({ receipt: token });
    // } catch (e) {
    //   if (e instanceof appleReceiptVerify.EmptyError) {
    //     // Receipt is valid but it is now empty.
    //     console.warn("Received valid empty receipt");
    //     callback(true);
    //   } else if (e instanceof appleReceiptVerify.ServiceUnavailableError) {
    //     console.warn("App store is currently unavailable, could not validate");
    //     // Handle app store services not being available
    //     callback(false);
    //   }
    //   callback(false);
    // }

    let expirationStatus = "";

    var self = this;
    async.waterfall(
      [
        function (done) {
          appleReceiptVerify.validate({ receipt: token }, (err, products) => {
            done(err, products);
          });
        },
        function (products, done) {
          async.each(
            products,
            (product, eachDone) => {
              const productData = productDataMap[product.productId];
              if (!productData) eachDone(null);
              // Process the product
              let purchaseData;
              switch (productData.type) {
                case "SUBSCRIPTION":
                  purchaseData = {
                    type: productData.type,
                    iapSource: "app_store",
                    orderId: product.originalTransactionId,
                    productId: product.productId,
                    user_id: user_id,
                    purchaseDate: product.purchaseDate,
                    expirationDate: product.expirationDate ?? 0,
                    status:
                      (product.expirationDate ?? 0) <= Date.now()
                        ? "EXPIRED"
                        : "ACTIVE",
                  };
                  if (purchaseData.status == "ACTIVE") {
                    expirationStatus = purchaseData.status;
                  } else if (expirationStatus == "") {
                    expirationStatus = purchaseData.status;
                  }
                  Purchase.updateOne(
                    { orderId: purchaseData.orderId },
                    { ...purchaseData, user_id: user_id },
                    { upsert: true },
                    (err) => {
                      eachDone(err);
                    }
                  );
                  break;
                case "NON_SUBSCRIPTION":
                  purchaseData = {
                    type: productData.type,
                    iapSource: "app_store",
                    orderId: product.originalTransactionId,
                    productId: product.productId,
                    user_id: user_id,
                    purchaseDate: product.purchaseDate,
                    status: "COMPLETED",
                  };
                  Purchase.updateOne(
                    { orderId: purchaseData.orderId },
                    { ...purchaseData, user_id: user_id },
                    { upsert: true },
                    (err) => {
                      eachDone(err);
                    }
                  );
                  break;
              }
            },
            function (err) {
              done(err);
            }
          );
        },
        function (done) {
          self.setUserSubscription(user_id, expirationStatus, done);
        },
      ],
      function (err) {
        if (err) {
          if (e instanceof appleReceiptVerify.EmptyError) {
            // Receipt is valid but it is now empty.
            console.warn("Received valid empty receipt");
            callback(false);
          } else if (e instanceof appleReceiptVerify.ServiceUnavailableError) {
            console.warn(
              "App store is currently unavailable, could not validate"
            );
            // Handle app store services not being available
            callback(false);
          }
          callback(false);
        } else callback(true);
      }
    );
    // // Process the received products
    // for (const product of products) {
    //   // Skip processing the product if it is unknown
    //   const productData = productDataMap[product.productId];
    //   if (!productData) continue;
    //   // Process the product
    //   let purchaseData;
    //   switch (productData.type) {
    //     case "SUBSCRIPTION":
    //       purchaseData = {
    //         type: productData.type,
    //         iapSource: "app_store",
    //         orderId: product.originalTransactionId,
    //         productId: product.productId,
    //         user_id: user_id,
    //         purchaseDate: product.purchaseDate,
    //         expirationDate: product.expirationDate ?? 0,
    //         status:
    //           (product.expirationDate ?? 0) <= Date.now()
    //             ? "EXPIRED"
    //             : "ACTIVE",
    //       };
    //       if (purchaseData.status == "ACTIVE") {
    //         expirationStatus = purchaseData.status;
    //       } else if (expirationStatus == "") {
    //         expirationStatus = purchaseData.status;
    //       }
    //       await Purchase.updateOne(
    //         { orderId: purchaseData.orderId },
    //         { ...purchaseData, user_id: user_id },
    //         { upsert: true }
    //       );
    //       // await this.iapRepository.createOrUpdatePurchase({
    //       // type: productData.type,
    //       // iapSource: "app_store",
    //       // orderId: product.originalTransactionId,
    //       // productId: product.productId,
    //       // user_id,
    //       // purchaseDate: product.purchaseDate,
    //       // expirationDate:
    //       //   product.expirationDate ?? 0,
    //       // status:
    //       //   (product.expirationDate ?? 0) <= Date.now()
    //       //     ? "EXPIRED"
    //       //     : "ACTIVE",
    //       // });
    //       break;
    //     case "NON_SUBSCRIPTION":
    //       purchaseData = {
    //         type: productData.type,
    //         iapSource: "app_store",
    //         orderId: product.originalTransactionId,
    //         productId: product.productId,
    //         user_id: user_id,
    //         purchaseDate: product.purchaseDate,
    //         status: "COMPLETED",
    //       };
    //       Purchase.updateOne(
    //         { orderId: purchaseData.orderId },
    //         { ...purchaseData, user_id: user_id },
    //         { upsert: true }
    //       );
    //       // await this.iapRepository.createOrUpdatePurchase({
    //       //   type: productData.type,
    //       //   iapSource: "app_store",
    //       //   orderId: product.originalTransactionId,
    //       //   productId: product.productId,
    //       //   user_id,
    //       //   purchaseDate: product.purchaseDate,
    //       //   status: "COMPLETED",
    //       // });
    //       break;
    //   }
    // }
    // this.setUserSubscription(user_id, expirationStatus);
    // return true;
  }

  async handleServerEvent(req, res) {
    const eventData = camelCaseKeys(req.body, { deep: true });
    // Decline events where the password does not match the shared secret
    if (eventData.password !== appleStoreSharedSecret) {
      return 403;
    }
    // Only process events where expiration changes are likely to occur
    if (
      ![
        "CANCEL",
        "DID_RENEW",
        "DID_FAIL_TO_RENEW",
        "DID_CHANGE_RENEWAL_STATUS",
        "INITIAL_BUY",
        "INTERACTIVE_RENEWAL",
        "REFUND",
        "REVOKE",
      ].includes(eventData.notificationType)
    ) {
      return 200;
    }
    // Find latest receipt for each original transaction
    const latestReceipts = Object.values(
      groupBy(
        eventData.unifiedReceipt.latestReceiptInfo,
        "originalTransactionId"
      )
    ).map((group) =>
      group.reduce((acc, e) =>
        !acc || e.expiresDateMs >= acc.expiresDateMs ? e : acc
      )
    );

    // Process receipt items
    let expirationMap = Map();
    const promises = [];
    for (const iap of latestReceipts) {
      const productData = productDataMap[iap.productId];
      // Skip products that are unknown
      if (!productData) continue;
      // Update products in firestore

      const promise = new Promise((resolve) => {
        switch (productData.type) {
          case "SUBSCRIPTION":
            try {
              let purchaseData = {
                iapSource: "app_store",
                orderId: iap.originalTransactionId,
                expirationDate: parseInt(iap.expiresDateMs, 10),
                status:
                  Date.now() >= parseInt(iap.expiresDateMs, 10)
                    ? "EXPIRED"
                    : "ACTIVE",
              };
              const query = Purchase.findOneAndUpdate(
                { orderId: purchaseData.orderId },
                {
                  iapSource: purchaseData.iapSource,
                  orderId: purchaseData.orderId,
                  expirationDate: purchaseData.expirationDate,
                  status: purchaseData.status,
                }
              );
              query.exec(async (err, purchase) => {
                if (err || !purchase) {
                  resolve();
                } else {
                  resolve({
                    user_id: purchase.user_id,
                    status: purchase.status,
                  });
                }
              });
            } catch (e) {
              console.log("Could not patch purchase", {
                originalTransactionId: iap.originalTransactionId,
                productId: iap.productId,
              });
            }
            break;
          case "NON_SUBSCRIPTION":
            // Nothing to update yet about non-subscription purchases
            break;
        }
        promises.push(promise);
      });
    }
    Promise.all(promises).then((values) => {
      for (const v of values) {
        if (!v) continue;
        if (!expirationMap.has(v.user_id)) {
          expirationMap[v.user_id] = v.status;
        } else if (v.status == "ACTIVE") {
          expirationMap[v.user_id] = v.status;
        }
      }

      Promise.all(
        Array.from(expirationMap).map(async ([user_id, status]) => {
          this.setUserSubscription(user_id, status);
        })
      ).then(() => {
        return 200;
      });
    });
  }
}
