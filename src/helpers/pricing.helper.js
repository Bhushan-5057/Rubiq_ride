import { Pricing } from "../models/pricing/pricing.model.js";

let pricingCache = null;
let lastFetched = 0;

const CACHE_TIME = 60 * 1000; // 1 minute

export async function getPricingConfig() {
  const now = Date.now();

  if (pricingCache && now - lastFetched < CACHE_TIME) {
    return pricingCache;
  }

  const pricing = await Pricing.findOne({ isActive: true }).lean();

  if (!pricing) {
    throw new Error("Pricing configuration not found");
  }

  pricingCache = {
    bike: pricing.bike,
    auto: pricing.auto,
    cab: pricing.cab,
  };

  lastFetched = now;

  return pricingCache;
}

export function clearPricingCache() {
  pricingCache = null;
}