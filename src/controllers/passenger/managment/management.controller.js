import {
  deletePassenger,
  getPassengerProfileStatus,
} from "../../../services/passenger/index.js";

// -------------------- Delete Passenger --------------------
export async function deletePassengerController(req, res, next) {
  try {
    const passengerId = req.params.passengerId || req.user?._id;

    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    if (req.user._id.toString() !== passengerId.toString()) {
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
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

// -------------------- Check Passenger Profile Status --------------------
export const checkProfileStatusController = async (req, res) => {
  try {
    const { contactNumber } = req.params;
    const status = await getPassengerProfileStatus(contactNumber);

    res.status(200).json({
      success: true,
      ...status,
    });
  } catch (err) {
    console.error("Error checking profile status:", err);
    if (err.message === "Passenger not found") {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
