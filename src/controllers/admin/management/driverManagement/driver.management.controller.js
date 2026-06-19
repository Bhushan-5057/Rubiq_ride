import { getAllDrivers, getDriverById, updateDriverStatus } from "../../../../services/adminServices/driverManagementService/driverManagement.service.js";
import { verifyDriverDocuments } from "../../../../services/adminServices/driverDocumentationService/driverDocument.service.js";
import { sendSuccess } from "../../../../utils/apiResponse.js";
import { emitAdminEvent } from "../../../../helpers/admin-realtime.helper.js";

// -------------------- Admin Udate Status --------------------
export async function updateStatusController(req, res, next) {
  try {
    const { driverId } = req.params;
    const { status, blockedReason } = req.body;

    if (!driverId || !status) {
      return res.status(400).json({ status: false, message: "Driver ID and status are required" });
    }

    const result = await updateDriverStatus(driverId, status, {
      adminId: req.admin?._id || req.user?.id,
      blockedReason,
    });
    emitAdminEvent("admin:driver_status_updated", {
      driverId,
      status,
      updatedBy: req.admin?._id?.toString?.() || req.user?.id,
    });

    return sendSuccess(res, 200, result.message, result.driver);
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

    return sendSuccess(res, 200, "Drivers fetched successfully", { pagination: result.pagination, drivers: result.data, });
  } catch (err) {
    next(err);
  }
}


// -------------------- Get Driver By ID --------------------
export async function getDriverByIdController(req, res, next) {
  try {
    const { driverId } = req.params;

    const driver = await getDriverById(driverId);

    return sendSuccess(res, 200, "Driver fetched successfully", driver);
  } catch (err) {
    console.error("Error in getDriverByIdController:", err.message);
    return res.status(404).json({
      status: false,
      message: err.message,
    });
  }
}

// -------------------- Verify Driver Documents --------------------
export async function verifyDriverDocumentsController(req, res, next) {
  try {
    const isAdmin = true;

    if (!isAdmin) {
      return res.status(403).json({ status: false, message: "Only admins can verify documents" });
    }

    const { driverId } = req.params;
    const verificationData = req.body;

    const result = await verifyDriverDocuments(driverId, verificationData);
    emitAdminEvent("admin:driver_approval_updated", {
      driverId,
      approvalStatus: result.driver?.approvalStatus,
      documentsVerified: result.driver?.documentsVerified,
      remarks: result.driver?.remarks,
      updatedBy: req.admin?._id?.toString?.() || req.user?.id,
    });
    emitAdminEvent(
      result.driver?.approvalStatus === "approved"
        ? "admin:driver_approved"
        : result.driver?.approvalStatus === "rejected"
          ? "admin:driver_rejected"
          : "admin:driver_verification_updated",
      {
        driverId,
        driver: result.driver,
        updatedBy: req.admin?._id?.toString?.() || req.user?.id,
      }
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
