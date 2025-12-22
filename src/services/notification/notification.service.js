import admin from "../../config/firebase.js";

export const sendPushNotification = async ({
  token,
  title,
  body,
  data = {},
}) => {
  if (!token) return;

  const message = {
    token,
    notification: {
      title,
      body,
    },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
  };

  try {
    await admin.messaging().send(message);
    console.log("FCM sent:", title);
  } catch (error) {
    console.error("FCM error:", error.message);
  }
};