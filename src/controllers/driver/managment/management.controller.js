import { deleteDriver, verifyDriverDocuments } from "../../../services/driver/index.js";

// -------------------- DELETE DRIVER --------------------
export async function deleteDriverController(req, res, next) {
  try {
    const { driverId } = req.params;
    const authenticatedDriverId = req.user._id.toString(); 

    
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




// -------------------- VERIFY DRIVER DOCUMENTS --------------------
export async function verifyDriverDocumentsController(req, res, next) {
  try {
    const { driverId } = req.params;
    // Allow passing remarks, approvalStatus, and optional per-document statuses in one call
    const result = await verifyDriverDocuments(driverId, req.body || {});
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
