import { ChatMessage } from "../../models/chat/chatMessageSchema.model.js";
import { validatedRideChatAccess } from "../../validations/chatMessage.validation.js";

export const getRideChat = async (req, res) => {
    const { rideId } = req.params;
    const { userId, userType } = req.user;
    await validatedRideChatAccess({ rideId, userId, userType })
    const messages = await ChatMessage.find({ ride: rideId })
        .sort({ createdAt: 1 });

    res.json({
        success: true,
        message: "User's chat fetched successfully",
        result: messages
    })
}