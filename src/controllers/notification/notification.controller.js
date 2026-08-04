import { Driver } from "../../models/driver/driver.model.js";
import { Passenger } from "../../models/passenger/passenger.model.js";
import { replaceUserFcmTokens } from "../../helpers/fcmToken.helper.js";

/**
 * Register device FCM token.
 * Policy: always replace the array with this single latest token
 * (old tokens are removed so documents stay small and pushes stay correct).
 */
export const saveFcmToken = async (req, res) => {
  const { fcmToken, platform = "android" } = req.body;
  const { sub: userId, role } = req.user;

  if (!fcmToken) {
    return res.status(400).json({ message: "FCM token required" });
  }

  const Model = role === "driver" ? Driver : Passenger;

  await replaceUserFcmTokens(Model, userId, fcmToken, platform);

  res.json({ success: true, message: "FCM token saved" });
};
