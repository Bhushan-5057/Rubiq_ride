import mongoose from "mongoose";

const vehiclePricingSchema = new mongoose.Schema(
  {
    baseFarePerKm: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFeePerKm: {
      type: Number,
      required: true,
      min: 0,
    },
    driverSharePerKm: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const pricingSchema = new mongoose.Schema(
  {
    bike: vehiclePricingSchema,
    auto: vehiclePricingSchema,
    cab: vehiclePricingSchema,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const Pricing = mongoose.model("Pricing", pricingSchema);
