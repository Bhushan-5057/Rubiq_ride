import {
  getPricingService,
  updatePricingService,
} from "../../../services/pricingService/pricing.service.js";

//---------------- Get Pricing ----------------
export const getPricing = async (req, res) => {
  try {
    const pricing = await getPricingService();

    res.status(200).json({
      status: true,
      message: "Pricing fetched successfully",
      data: pricing,
    });
  } catch (err) {
    res.status(400).json({
      status: false,
      message: err.message,
    });
  }
};

//---------------- Update Pricing ----------------
export const updatePricing = async (req, res) => {
  try {
    const pricing = await updatePricingService(req.body);

    res.status(200).json({
      status: true,
      message: "Pricing updated successfully",
      data: pricing,
    });
  } catch (err) {
    res.status(400).json({
      status: false,
      message: err.message,
    });
  }
};
