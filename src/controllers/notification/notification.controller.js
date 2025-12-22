import { Driver } from "../../models/driver/driver.model.js";
import { Passenger } from "../../models/passenger/passenger.model.js";

export const saveFcmToken = async (req, res,next) => {
  try {
    const { userId, userType, fcmToken } = req.body;

    if (!userId || !userType || !fcmToken) {
      return res.status(400).json({ message: "Missing fields" });
    }

    let user;
    if (userType === "driver") {
      user = await Driver.findByIdAndUpdate(userId, { fcmToken }, { new: true });
    } else if (userType === "passenger") {
      user = await Passenger.findByIdAndUpdate(userId, { fcmToken }, { new: true });
    } else {
      return res.status(400).json({ message: "Invalid user type" });
    }

    res.json({ success: true, message: "FCM token saved", [userType]: user });
  } catch (error) {
    next(error);
  }
};
