import credentials from "../config/credentials.json";
import { Purchase, User } from "../models";
import { productDataMap } from "../config/products";
import { androidPackageId } from "../config/config";
import { androidpublisher_v3 as AndroidPublisherApi } from "@googleapis/androidpublisher";
import { GoogleAuth } from "google-auth-library";
import async from "async";

// var androidPublisher = AndroidPublisherApi.Androidpublisher;
export class GooglePurchaseHandler {
  androidPublisher;
  constructor() {
    this.androidPublisher = new AndroidPublisherApi.Androidpublisher({
      auth: new GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/androidpublisher"],
      }),
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

  async handleNonSubscription(user_id, productData, token) {
    try {
      // Verify purchase with Google
      const response = await this.androidPublisher.purchases.products.get({
        packageName: androidPackageId,
        productId: productData.productId,
        token,
      });
      // Make sure an order id exists
      if (!response.data.orderId) {
        console.error("Could not handle purchase without order id");
        return false;
      }
      // Construct purchase data for db updates
      return {
        type: "NON_SUBSCRIPTION",
        iapSource: "google_play",
        orderId: response.data.orderId,
        productId: productData.productId,
        purchaseDate: response.data.purchaseTimeMillis,
        status: ["COMPLETED", "CANCELLED", "PENDING"][
          response.data.purchaseState ?? 0
        ],
      };
      // // Update the database
      // try {
      //   if (user_id) {
      //     // If we know the user_id,
      //     // update the existing purchase or create it if it does not exist.
      //     // await this.iapRepository
      //     //     .createOrUpdatePurchase({
      //     //       ...purchaseData,
      //     //       user_id,
      //     //     } as Purchase);
      //   } else {
      //     // If we do not know the user id, a previous entry must already
      //     // exist, and thus we'll only update it.
      //     // await this.iapRepository.updatePurchase(purchaseData);
      //   }
      // } catch (e) {
      //   console.log("Could not create or update purchase", {
      //     orderId: response.data.orderId,
      //     productId: productData.productId,
      //   });
      // }
      // return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async handleSubscription(user_id, productData, token, callback) {
    try {
      var self = this;
      async.waterfall(
        [
          function (done) {
            // Verify the purchase with Google
            self.androidPublisher.purchases.subscriptions
              .get({
                packageName: androidPackageId,
                subscriptionId: productData.productId,
                token,
              })
              .then((response) => {
                // console.log("RESPONSE" + response);
                done(null, response);
              });
          },
          function (response, done) {
            if (!response.data.orderId) {
              console.error("Could not handle purchase without order id");
              return false;
            }
            // If a subscription suffix is present (..#) extract the orderId.
            let orderId = response.data.orderId;
            const orderIdMatch = /^(.+)?[.]{2}[0-9]+$/g.exec(orderId);
            if (orderIdMatch) {
              orderId = orderIdMatch[1];
            }
            // console.log({
            //   rawOrderId: response.data.orderId,
            //   newOrderId: orderId,
            // });
            let purchaseData = {
              type: "SUBSCRIPTION",
              iapSource: "google_play",
              orderId: orderId,
              productId: productData.productId,
              purchaseDate: Number(response.data.startTimeMillis),
              expirationDate: Number(response.data.expiryTimeMillis),
              status: [
                "PENDING", // Payment pending
                "ACTIVE", // Payment received
                "ACTIVE", // Free trial
                "PENDING", // Pending deferred upgrade/downgrade
                "EXPIRED", // Expired or cancelled
              ][response.data.paymentState ?? 4],
            };
            if (user_id != null) {
              // console.log("USER ID NOT NULL " + user_id);
              const query = Purchase.updateOne(
                { orderId: purchaseData.orderId },
                { ...purchaseData, user_id: user_id },
                { upsert: true }
              );
              query.exec(async (err) => {
                if (err) {
                  // console.log("UE RETURN ERROR");
                  console.log(err);
                  done(err);
                } else {
                  done(null, purchaseData.status, user_id);
                }
              });
            } else {
              // console.log("USER ID NULL ");
              // console.log(purchaseData);
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
                  done("No purchase found");
                } else {
                  done(null, purchaseData.status, purchase.user_id);
                }
              });
            }
          },
          function (status, user_id, done) {
            // console.log("UE STATUSUSER", status, user_id);
            self.setUserSubscription(user_id, status, done);
          },
        ],
        function (err) {
          if (err) callback(false);
          else callback(true);
        }
      );
    } catch (e) {
      console.error(e);
      callback(false);
    }
  }

  async handleServerEvent(message) {
    // Define the event
    // https://developer.android.com/google/play/billing/rtdn-reference
    // type GooglePlayOneTimeProductNotification = {
    //   "version": string;
    //   "notificationType": number;
    //   "purchaseToken": string;
    //   "sku": string;
    // }
    // type GooglePlaySubscriptionNotification = {
    //   "version": string;
    //   "notificationType": number;
    //   "purchaseToken": string;
    //   "subscriptionId": string;
    // }
    // type GooglePlayTestNotification = {
    //   "version": string;
    // }
    // type GooglePlayBillingEvent = {
    //   "version": string;
    //   "packageName": string;
    //   "eventTimeMillis": number;
    //   "oneTimeProductNotification": GooglePlayOneTimeProductNotification;
    //   "subscriptionNotification": GooglePlaySubscriptionNotification;
    //   "testNotification": GooglePlayTestNotification;
    // }
    // let event: GooglePlayBillingEvent;
    let event;
    // Parse the event data
    try {
      event = JSON.parse(Buffer.from(message.data, "base64").toString("ascii"));
    } catch (e) {
      console.error("Could not parse Google Play billing event", e);
      return;
    }
    // console.log(event);
    // Skip test events
    if (event.testNotification) return;
    // Extract event data
    const { purchaseToken, subscriptionId, sku } = {
      ...event.subscriptionNotification,
      ...event.oneTimeProductNotification,
    };
    // Get the product for this event
    const productData = productDataMap[subscriptionId ?? sku];
    // Skip products that are unknown
    if (!productData) return;
    // Skip products that do not match the notification type
    const notificationType = subscriptionId
      ? "SUBSCRIPTION"
      : sku
      ? "NON_SUBSCRIPTION"
      : null;
    if (productData.type !== notificationType) return;
    // Handle notifications
    switch (notificationType) {
      case "SUBSCRIPTION":
        // console.log("EVENT - HANDLE SUB");
        return await this.handleSubscription(
          null,
          productData,
          purchaseToken,
          () => {}
        );
        break;
      case "NON_SUBSCRIPTION":
        return await this.handleNonSubscription(
          null,
          productData,
          purchaseToken,
          () => {}
        );
        break;
    }
  }
}
