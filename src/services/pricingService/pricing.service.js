import { Pricing } from "../../models/pricing/pricing.model.js";
import {clearPricingCache} from "../../helpers/pricing.helper.js";

const DRIVER_SHARE_PERCENT = 0.8;
const PLATFORM_SHARE_PERCENT = 0.2;

//---------------- Calculate Pricing ----------------
const calculatePricing = (baseFare) => ({
  baseFarePerKm: baseFare,
  platformFeePerKm: Number((baseFare * PLATFORM_SHARE_PERCENT).toFixed(2)),
  driverSharePerKm: Number((baseFare * DRIVER_SHARE_PERCENT).toFixed(2)),
});

//---------------- Default Pricing ----------------
const DEFAULT_PRICING = {
  bike: calculatePricing(8),
  auto: calculatePricing(11),
  cab: calculatePricing(15),
};

//---------------- Get Pricing ----------------
export async function getPricingService() {
  let pricing = await Pricing.findOne({ isActive: true });

  if (!pricing) {
    pricing = await Pricing.create(DEFAULT_PRICING);
  }

  return pricing;
}

//---------------- Update Pricing ----------------
export async function updatePricingService(data) {
  let pricing = await Pricing.findOne({ isActive: true });

  if (!pricing) {
    pricing = await Pricing.create(DEFAULT_PRICING);
  }

  const vehicleTypes = ["bike", "auto", "cab"];

  vehicleTypes.forEach((vehicle) => {
    if (data[vehicle] && data[vehicle].baseFarePerKm !== undefined) {
      pricing[vehicle] = calculatePricing(Number(data[vehicle].baseFarePerKm));
    }
  });

  await pricing.save();
  clearPricingCache();

  return pricing;
}
