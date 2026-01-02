import {
  deletePassenger,
  getPassengerProfileStatus,
} from "../../../services/adminServices/passengerManagementByAdmin/passengerManagement.service.js";


// -------------------- Delete Passenger --------------------
export async function deletePassengerController(req, res, next) {
  try {
    const passengerId = req.params.passengerId || req.passenger?._id;

    if (!req.passenger) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    if (req.passenger._id.toString() !== passengerId.toString()) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Forbidden: can only delete your own account",
        });
    }

    const result = await deletePassenger(passengerId);

    return res.json({
      success: true,
      message: "Passenger deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// -------------------- Check Passenger Profile Status --------------------
export const checkProfileStatusController = async (req, res, next) => {
  try {
    const { contactNumber } = req.params;
    const status = await getPassengerProfileStatus(contactNumber);

    res.status(200).json({
      success: true,
      message: "Passenger Status Fetched Successfuly",
      data: status,
    });
  } catch (error) {
    console.error("Error checking profile status:", error);
    if (error.message === "Passenger not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};