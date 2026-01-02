import admin from "../../config/firebase.js";
import { Passenger } from "../../models/passenger/passenger.model.js";
import { Driver } from "../../models/driver/driver.model.js";

export const sendPushNotification = async ({
  token,
  title,
  body,
  data = {},
  userType = "passenger",
}) => {
  console.log("📤 Sending FCM to:", token);
  console.log("📦 Payload data:", data);

  if (!token) {
    const error = new Error("FCM token is required");
    error.code = "missing-token";
    throw error;
  }

  // Validate token format
  if (typeof token !== 'string' || token.length < 8) {
    const error = new Error("Invalid FCM token format");
    error.code = "invalid-token-format";
    throw error;
  }

  const message = {
    token,
    notification: {
      title: String(title || '').substring(0, 100), // Limit title length
      body: String(body || '').substring(0, 200),   // Limit body length
    },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [
        String(k).substring(0, 50), // Limit key length
        String(v).substring(0, 1000) // Limit value length
      ])
    ),
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          contentAvailable: true,
          mutableContent: 1
        },
      },
    },
    webpush: {
      headers: {
        TTL: '86400', // 24 hours in seconds
        priority: 'high'
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("✅ FCM sent successfully:", response);
    return response;
  } catch (error) {
    console.error("❌ FCM error:", error.code, error.message);
    
    // Attach the token to the error for easier handling upstream
    error.token = token;
    error.userType = userType;
    
    // Re-throw the error to be handled by the caller
    throw error;
  }
};
