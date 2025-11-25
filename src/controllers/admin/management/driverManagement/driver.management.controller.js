import { getAllDrivers, getDriverById, updateDriverStatus } from "../../../../services/adminServices/driverManagementService/driverManagement.service.js";
import { verifyDriverDocuments } from "../../../../services/adminServices/driverManagementByAdmin/driverDocument.service.js";

// -------------------- ADMIN: UPDATE STATUS --------------------
export async function updateStatusController(req, res, next) {
  try {

    const { driverId, status } = req.body;

    if (!driverId || !status) {
      return res.status(400).json({ success: false, message: "Driver ID and status are required" });
    }

    const result = await updateDriverStatus(driverId, status);

    res.json({ success: true, message: "Driver status updated", ...result });
  } catch (err) {
    next(err);
  }
}

// -------------------- ADMIN: GET ALL DRIVERS --------------------
export async function getAllDriversController(req, res, next) {
  try {
    const drivers = await getAllDrivers();
    res.json({ success: true, drivers });
  } catch (err) {
    next(err);
  }
}


// -------------------- GET DRIVER BY ID --------------------
export async function getDriverByIdController(req, res, next) {
  try {
    const driverId = req.params.id; // from route /get/:id

    const driver = await getDriverById(driverId);

    return res.status(200).json({
      success: true,
      data: driver,
    });
  } catch (err) {
    console.error("Error in getDriverByIdController:", err.message);
    return res.status(404).json({
      success: false,
      message: err.message,
    });
  }
} 

// -------------------- VERIFY DRIVER DOCUMENTS --------------------
export async function verifyDriverDocumentsController(req, res, next) {
  try {
    const isAdmin = true;

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Only admins can verify documents" });
    }

    const { driverId } = req.params;
    const verificationData = req.body;

    const result = await verifyDriverDocuments(driverId, verificationData);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

