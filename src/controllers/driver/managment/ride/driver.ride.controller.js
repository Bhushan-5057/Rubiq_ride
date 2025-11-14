import { updateDriverLocationService } from "../../../../services/driver/management/ride/driver.ride.service.js";

export const updateDriverLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    const updatedDriver = await updateDriverLocationService(req.driver, lat, lng);

    res.json({
      success: true,
      message: "Location updated successfully",
      driver: updatedDriver, 
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};