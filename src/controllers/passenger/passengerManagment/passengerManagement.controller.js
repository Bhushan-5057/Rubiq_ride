import { getPassengerProfileStatus } from "../../../services/adminServices/passengerManagementByAdmin/passengerManagement.service.js";


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
