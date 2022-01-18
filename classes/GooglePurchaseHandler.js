import credentials from "../config/credentials.json";
import { productDataMap } from "../config/products";
import { androidPackageId } from "../config/config";
import { androidpublisher_v3 as AndroidPublisherApi } from "@googleapis/androidpublisher";
import { GoogleAuth } from "google-auth-library";

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
  }

  async handleNonSubscription(userId, productData, token) {
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
      //   if (userId) {
      //     // If we know the userId,
      //     // update the existing purchase or create it if it does not exist.
      //     // await this.iapRepository
      //     //     .createOrUpdatePurchase({
      //     //       ...purchaseData,
      //     //       userId,
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

  async handleSubscription(userId, productData, token) {
    try {
      // Verify the purchase with Google
      const response = await this.androidPublisher.purchases.subscriptions.get({
        packageName: androidPackageId,
        subscriptionId: productData.productId,
        token,
      });
      // Make sure an order id exists
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
      console.log({
        rawOrderId: response.data.orderId,
        newOrderId: orderId,
      });
      // Construct purchase data for db updates
      return {
        type: "SUBSCRIPTION",
        iapSource: "google_play",
        orderId: orderId,
        productId: productData.productId,
        purchaseDate: response.data.startTimeMillis,
        expiryDate: response.data.expiryTimeMillis,
        status: [
          "PENDING", // Payment pending
          "ACTIVE", // Payment received
          "ACTIVE", // Free trial
          "PENDING", // Pending deferred upgrade/downgrade
          "EXPIRED", // Expired or cancelled
        ][response.data.paymentState ?? 4],
      };
      // try {
      //   if (userId) {
      //     // If we know the userId,
      //     // update the existing purchase or create it if it does not exist.
      //     // await this.iapRepository
      //     //     .createOrUpdatePurchase({
      //     //       ...purchaseData,
      //     //       userId,
      //     //     });
      //   } else {
      //     // If we do not know the user id, a previous entry must already
      //     // exist, and thus we'll only update it.
      //     // await this.iapRepository.updatePurchase(purchaseData);
      //   }
      // } catch (e) {
      //   console.log("Could not create or update purchase", {
      //     orderId,
      //     productId: productData.productId,
      //   });
      // }
      // return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  //   handleServerEvent = functions.pubsub.topic(GOOGLE_PLAY_PUBSUB_BILLING_TOPIC)
  //       .onPublish(async (message) => {
  //         // Define the event
  //         // https://developer.android.com/google/play/billing/rtdn-reference
  //         type GooglePlayOneTimeProductNotification = {
  //           "version": string;
  //           "notificationType": number;
  //           "purchaseToken": string;
  //           "sku": string;
  //         }
  //         type GooglePlaySubscriptionNotification = {
  //           "version": string;
  //           "notificationType": number;
  //           "purchaseToken": string;
  //           "subscriptionId": string;
  //         }
  //         type GooglePlayTestNotification = {
  //           "version": string;
  //         }
  //         type GooglePlayBillingEvent = {
  //           "version": string;
  //           "packageName": string;
  //           "eventTimeMillis": number;
  //           "oneTimeProductNotification": GooglePlayOneTimeProductNotification;
  //           "subscriptionNotification": GooglePlaySubscriptionNotification;
  //           "testNotification": GooglePlayTestNotification;
  //         }
  //         let event: GooglePlayBillingEvent;
  //         // Parse the event data
  //         try {
  //           event = JSON.parse(new Buffer(message.data, "base64").toString("ascii"));
  //         } catch (e) {
  //           console.error("Could not parse Google Play billing event", e);
  //           return;
  //         }
  //         // Skip test events
  //         if (event.testNotification) return;
  //         // Extract event data
  //         const {purchaseToken, subscriptionId, sku} = {
  //           ...event.subscriptionNotification,
  //           ...event.oneTimeProductNotification,
  //         };
  //         // Get the product for this event
  //         const productData = productDataMap[subscriptionId ?? sku];
  //         // Skip products that are unknown
  //         if (!productData) return;
  //         // Skip products that do not match the notification type
  //         const notificationType = subscriptionId ? "SUBSCRIPTION" : sku ? "NON_SUBSCRIPTION" : null;
  //         if (productData.type !== notificationType) return;
  //         // Handle notifications
  //         switch (notificationType) {
  //           case "SUBSCRIPTION":
  //             await this.handleSubscription(null, productData, purchaseToken);
  //             break;
  //           case "NON_SUBSCRIPTION":
  //             await this.handleNonSubscription(null, productData, purchaseToken);
  //             break;
  //         }
  //       });
}
