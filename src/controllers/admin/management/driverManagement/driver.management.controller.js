import { getAllDrivers, getDriverById, updateDriverStatus } from "../../../../services/adminServices/driverManagementService/driverManagement.service.js";
import { verifyDriverDocuments } from "../../../../services/adminServices/driverDocumentationService/driverDocument.service.js";

// -------------------- Admin Udate Status --------------------
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

// -------------------- Admin Get All Drivers --------------------
export async function getAllDriversController(req, res, next) {
  try {
    // Extract query parameters
    const { 
      page = 1, 
      limit = 5, 
      status, 
      search, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    // Validate page and limit
    const pageNum = Math.max(1, parseInt(page)) || 1;
    const limitNum = Math.max(1, parseInt(limit)) || 5;

    // Call service with filters
    const result = await getAllDrivers({
      page: pageNum,
      limit: limitNum,
      status,
      search,
      sortBy,
      sortOrder
    });

    res.json({ 
      success: true, 
      pagination: result.pagination,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
}


// -------------------- Get Driver By ID --------------------
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

// -------------------- Verify Driver Documents --------------------
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