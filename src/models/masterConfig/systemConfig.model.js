import mongoose from "mongoose";

const systemConfigSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    value: {
        type: String,
        required: true
    },
    category: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin"
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin"
    }
},
    { timestamps: true })
    
export default mongoose.model("SystemConfig", systemConfigSchema)