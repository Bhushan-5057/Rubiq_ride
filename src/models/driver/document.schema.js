import mongoose from "mongoose";

const statusEnum = ["not_uploaded", "pending", "approved", "rejected"];

const documentSchema = new mongoose.Schema(
  {
    aadhaarFront: { type: String },
    aadhaarBack: { type: String },
    aadhaarStatus: { type: String, enum: statusEnum, default: "not_uploaded" },

    panFront: { type: String },
    panStatus: { type: String, enum: statusEnum, default: "not_uploaded", },

    licenseFront: { type: String },
    licenseBack: { type: String },
    licenseStatus: { type: String, enum: statusEnum, default: "not_uploaded", },

    rcFront: { type: String },
    rcBack: { type: String },
    rcStatus: { type: String, enum: statusEnum, default: "not_uploaded", },

    insurance: { type: String },
    insuranceStatus: { type: String, enum: statusEnum, default: "not_uploaded", },
  },
  { _id: false }
);

export default documentSchema;
