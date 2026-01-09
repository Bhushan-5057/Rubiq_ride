import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
    {
        ride: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Ride",
            required: true,
            index: true
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        senderType: {
            type: String,
            enum: ["passenger", "driver"],
            required: true
        },
        message: {
            type: String,
            trim: true,
            required: true
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema)