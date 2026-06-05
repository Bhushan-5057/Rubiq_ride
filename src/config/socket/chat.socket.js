import { ChatMessage } from "../../models/chat/chatMessageSchema.model.js";
import { validatedRideChatAccess } from "../../validations/chatMessage.validation.js";
import { emitAdminSupportChatEvent } from "../../helpers/admin-realtime.helper.js";

export const registerChatEvents = (io, socket) => {
    socket.on("join_ride_chat", async ({ rideId, userId, userType }, ack) => {
        try {
            await validatedRideChatAccess({ rideId, userId, userType });
            socket.join(`ride_${rideId}`);
            console.log(`${userType} joined chat for ride ${rideId}`)
            console.log("ROOM MEMBERS:", io.sockets.adapter.rooms.get(`ride_${rideId}`));
            if (typeof ack === "function") {
                ack({ success: true, room: `ride_${rideId}` });
            }
        } catch (error) {
            socket.emit("Chat_error", error.message)
            if (typeof ack === "function") {
                ack({ success: false, message: error.message });
            }
        }
    });

    socket.on("send_message", async (data, ack) => {
        try {
            const { rideId, senderId, senderType, message } = data
            await validatedRideChatAccess({
                rideId,
                userId: senderId,
                userType: senderType
            })

            const chat = await ChatMessage.create({
                ride: rideId,
                senderId,
                senderType,
                message
            })
            io.to(`ride_${rideId}`).emit("receive_message", {
                _id: chat._id,
                rideId,
                senderId,
                senderType,
                message,
                createdAt: chat.createdAt
            })
            emitAdminSupportChatEvent({
                messageId: chat._id,
                rideId,
                senderId,
                senderType,
                message,
                createdAt: chat.createdAt
            })
            if (typeof ack === "function") {
                ack({ success: true, messageId: chat._id });
            }
        } catch (error) {
            socket.emit("Chat_error", error.message)
            if (typeof ack === "function") {
                ack({ success: false, message: error.message });
            }
        }
    })
}
