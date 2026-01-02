import { sendPushNotification } from "./notification.service.js";
import { Passenger } from "../../models/passenger/passenger.model.js";
import { Driver } from "../../models/driver/driver.model.js";

export const sendToUser = async ({
  user,
  title,
  body,
  data,
  userType = 'passenger'
}) => {
  if (!user?.fcmTokens?.length) {
    console.log("ℹ️ No FCM tokens for user");
    return { success: false, message: "No FCM tokens found" };
  }

  const Model = userType === 'driver' ? Driver : Passenger;
  const results = [];
  const tokensToRemove = [];

  for (const t of user.fcmTokens) {
    try {
      const result = await sendPushNotification({
        token: t.token,
        title,
        body,
        data,
        userType
      });
      results.push({ token: t.token, success: true, result });
    } catch (error) {
      console.error(`❌ Error sending to token ${t.token}:`, error.message);
      results.push({ token: t.token, success: false, error: error.message });
      
      // If token is invalid, mark for removal
      if (error.code === 'messaging/registration-token-not-registered' || 
          error.message?.includes('Requested entity was not found')) {
        tokensToRemove.push(t.token);
      }
    }
  }

  // Remove invalid tokens from the database
  if (tokensToRemove.length > 0) {
    try {
      // Try to remove by exact token match first
      const updateResult = await Model.updateOne(
        { _id: user._id },
        { $pull: { fcmTokens: { token: { $in: tokensToRemove } } } }
      );
      
      // If no tokens were removed, try removing by token suffix
      if (updateResult.modifiedCount === 0) {
        const tokenSuffixes = tokensToRemove.map(t => t.split(':').pop());
        await Model.updateOne(
          { _id: user._id },
          { $pull: { fcmTokens: { token: { $in: tokenSuffixes } } } }
        );
      }
      
      console.log(`✅ Removed ${tokensToRemove.length} invalid FCM token(s)`);
      
      // Log the tokens that were removed
      console.log('Removed tokens:', tokensToRemove);
      
    } catch (error) {
      console.error('❌ Error removing invalid tokens:', error.message);
      // Log the full error for debugging
      console.error('Error details:', {
        userId: user._id,
        tokensToRemove,
        error: error.message,
        stack: error.stack
      });
    }
  }

  return {
    success: results.some(r => r.success),
    results,
    tokensRemoved: tokensToRemove
  };
};
