import mongoose from "mongoose";

const statusEnum = ["incomplete", "pending", "approved", "rejected"];

const documentSchema = new mongoose.Schema(
  {
    aadhaarFront: { type: String },
    aadhaarBack: { type: String },
    aadhaarStatus: { type: String, enum: statusEnum, default: "incomplete" },

    panFront: { type: String },
    panBack: { type: String },
    panStatus: {
      type: String,
      enum: ["incomplete", "pending", "approved", "rejected"],
      default: "incomplete",
    },

    licenseFront: { type: String },
    licenseBack: { type: String },
    licenseStatus: {
      type: String,
      enum: ["incomplete", "pending", "approved", "rejected"],
      default: "incomplete",
    },

    rcFront: { type: String },
    rcBack: { type: String },
    rcStatus: {
      type: String,
      enum: ["incomplete", "pending", "approved", "rejected"],
      default: "incomplete",
    },
  },
  { _id: false }
);

export default documentSchema;
