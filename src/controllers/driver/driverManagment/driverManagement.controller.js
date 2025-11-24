import { deleteDriver} from "../../../services/adminServices/driverManagementService/driverManagement.service.js";  


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


