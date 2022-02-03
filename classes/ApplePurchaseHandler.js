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
// import jwt from "jsonwebtoken";
import base64url from "base64url";

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
      environment: ["production", "sandbox"], // Optional, defaults to ['production'],
      excludeOldTransactions: true,
    });

    this.handleNonSubscription = this.handleNonSubscription.bind(this);
    this.handleSubscription = this.handleSubscription.bind(this);
    this.handleServerEvent = this.handleServerEvent.bind(this);
  }

  async setUserSubscription(user_id, status, callback) {
    console.log("SET USER STATUS", user_id, status);
    if (status == "ACTIVE" || status == "EXPIRED") {
      User.updateOne(
        { _id: user_id },
        {
          subscribed: status == "ACTIVE" ? true : false,
        }
      ).exec((err) => callback(err));
    } else callback(null);
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
    // console.log("HANDLE VALIDATION", token);
    var self = this;
    async.waterfall(
      [
        function (done) {
          appleReceiptVerify.validate({ receipt: token }, (err, products) => {
            done(err, products);
          });
        },
        function (products, done) {
          // console.log("HANDLE VALIDATION PRODUCTS", products);
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
          console.log("HANDLE VALIDATION SET USER", user_id, expirationStatus);
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
  }

  async handleServerEvent(req, res) {
    // const eventData = camelCaseKeys(req.body, { deep: true });
    try {
      const cryptedEventData = req.body.signedPayload.split(".")[1];
      const cryptedEventHeader = req.body.signedPayload.split(".")[0];
      const cryptedEventSignature = req.body.signedPayload.split(".")[2];
      // const cryptedEventData = req.body.signedPayload;

      let eventData = JSON.parse(base64url.decode(cryptedEventData));
      console.log("APPLE MESSAGE", eventData);

      // let eventHeader = base64url.decode(cryptedEventHeader);
      // console.log("APPLE HEADER", eventHeader);

      // let eventSignature = base64url.decode(cryptedEventSignature);
      // console.log("APPLE SIGNATURE", eventSignature);

      // var decoded = jwt.verify(eventHeader, appleStoreSharedSecret, {
      //   algorithms: ["ES256"],
      // });
      // console.log("JWT DECODED", decoded);

      // Decline events where the password does not match the shared secret

      // if (eventData.password !== appleStoreSharedSecret) {
      //   return 403;
      // }

      // Only process events where expiration changes are likely to occur
      if (
        ![
          "CANCEL",
          "DID_RENEW",
          "DID_FAIL_TO_RENEW",
          "DID_CHANGE_RENEWAL_STATUS",
          // "DID_CHANGE_RENEWAL_PREF",
          "INITIAL_BUY",
          "INTERACTIVE_RENEWAL",
          "REFUND",
          "REVOKE",
          "EXPIRED",
        ].includes(eventData.notificationType)
      ) {
        console.log("RETURN 200", eventData.notificationType);
        return 200;
      }

      let iap = JSON.parse(
        base64url.decode(eventData["data"].signedTransactionInfo.split(".")[1])
      );

      console.log("Signed Transaction Info", iap);

      const productData = productDataMap[iap.productId];

      if (!productData) return;

      var self = this;
      async.waterfall(
        [
          function (done) {
            switch (productData.type) {
              case "SUBSCRIPTION":
                let purchaseData = {
                  iapSource: "app_store",
                  orderId: iap.originalTransactionId,
                  expirationDate: parseInt(iap.expiresDate, 10),
                  status:
                    Date.now() >= parseInt(iap.expiresDate, 10)
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
                  if (err) {
                    done(err);
                  } else if (!purchase) {
                    done("purchase not found");
                  } else {
                    done(null, purchase.status, purchase.user_id);
                  }
                });
                break;
              case "NON_SUBSCRIPTION":
                // Nothing to update yet about non-subscription purchases
                done("no sub to handle");
                break;
            }
          },
          function (status, user_id, done) {
            self.setUserSubscription(user_id, status, done);
          },
        ],
        function (err) {
          if (err) return 403;
          else return 200;
        }
      );
    } catch (e) {
      console.log("ERRORE APPLE", e);
      return 403;
    }
  }
}
