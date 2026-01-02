import { Driver } from "../../models/driver/driver.model.js";
import { Passenger } from "../../models/passenger/passenger.model.js";

export const saveFcmToken = async (req, res) => {
  const { fcmToken, platform = "android" } = req.body;
  const { sub: userId, role } = req.user;

  if (!fcmToken) {
    return res.status(400).json({ message: "FCM token required" });
  }

  const Model = role === "driver" ? Driver : Passenger;

  await Model.updateOne(
    { _id: userId, "fcmTokens.token": { $ne: fcmToken } },
    {
      $push: {
        fcmTokens: {
          token: fcmToken,
          platform,
          lastActiveAt: new Date()
        }
      }
    }
  );

  console.log("✅ FCM token added:", fcmToken);

  res.json({ success: true });
};



