import { deleteDriver, verifyDriverDocuments } from "../../../services/driver/index.js";

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




// -------------------- VERIFY DRIVER DOCUMENTS --------------------
export async function verifyDriverDocumentsController(req, res, next) {
  try {
    const isAdmin = true;

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Only admins can verify documents" });
    }

    const { driverId } = req.params;
    const { remarks, approvalStatus } = req.body;

    const result = await verifyDriverDocuments(driverId, { remarks, approvalStatus });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
