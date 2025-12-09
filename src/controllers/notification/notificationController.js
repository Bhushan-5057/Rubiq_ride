import admin from "../../config/firebase.js";

//------------------------------- Test Notification For FCM -------------------------------
export const sendTestNotification = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "FCM token is required" });
    }

    const message = {
      token,
      notification: {
        title: "Hello from backend 🚀",
        body: "This is your first push notification!",
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
    };

    const response = await admin.messaging().send(message);

    return res.json({ success: true, response });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
