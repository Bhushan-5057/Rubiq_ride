import { deleteDriver } from "../../../services/adminServices/driverManagementService/driverManagement.service.js";
import { 
  getAllRidesForDriverService, 
  getRideByIdService 
} from "../../../services/driverServices/index.js";

// -------------------- RIDE MANAGEMENT --------------------

// Controller to get ride by id for driver
export const getRideById = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { rideId } = req.params;
    const ride = await getRideByIdService(rideId, driverId);
    res.status(200).json({ success: true, ride });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// Controller to get all rides for driver
export const getAllRidesForDriver = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const rides = await getAllRidesForDriverService(driverId);
    res.status(200).json({ success: true, rides });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// -------------------- DELETE DRIVER --------------------
export async function deleteDriverController(req, res, next) {
  try {
    const { driverId } = req.params;
    const authenticatedDriverId = req.driver._id.toString(); 

    
    if (authenticatedDriverId !== driverId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: you can only delete your own account",
      });
    }

    const result = await deleteDriver(driverId);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}


