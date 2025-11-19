import mongoose from "mongoose";

const statusEnum = ["not_uploaded", "pending", "approved", "rejected"];

const documentSchema = new mongoose.Schema(
  {
    aadhaarNumber: { type: String, unique: true, sparse: true },
    aadhaarFront: { type: String },
    aadhaarBack: { type: String },
    aadhaarStatus: { type: String, enum: statusEnum, default: "not_uploaded" },

    panNumber: { type: String, unique: true, sparse: true },
    panFront: { type: String },
    panStatus: { type: String, enum: statusEnum, default: "not_uploaded", },

    licenseNumber: { type: String, unique: true, sparse: true },
    licenseFront: { type: String },
    licenseBack: { type: String },
    licenseStatus: { type: String, enum: statusEnum, default: "not_uploaded", },

    rcNumber: { type: String, unique: true, sparse: true },
    rcFront: { type: String },
    rcBack: { type: String },
    rcStatus: { type: String, enum: statusEnum, default: "not_uploaded", },

    insuranceNumber: { type: String, unique: true, sparse: true },
    insurance: { type: String },
    insuranceStatus: { type: String, enum: statusEnum, default: "not_uploaded", },
  },
  { _id: false }
);

export default documentSchema;
