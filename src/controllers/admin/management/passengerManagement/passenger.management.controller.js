import { getPassengerById,getAllPassenger, updatePassangerStatus, } from "../../../../services/adminServices/index.js";


export async function updatePassengerStatusController(req, res, next) {
  try {
    if (req.admin.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can update passenger status" });
    }

    const { passengerId } = req.params; 
    const { status } = req.body; 

    if (!["active","deactive", "suspended"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const result = await updatePassangerStatus(passengerId, status);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// -------------------- Get All Passengers --------------------
export async function getAllPassengersController(req, res, next) {
  try {
    const passengers = await getAllPassenger();
    res.json({ success: true, passengers });
  } catch (err) {
    next(err);
  }
}

// -------------------- Get Passenger by ID --------------------
export async function getPassengerByIdController(req, res, next) {
  try {
    const { passengerId } = req.params;
    if (!passengerId) return res.status(400).json({ success: false, message: "Passenger ID required" });

    const passenger = await getPassengerById(passengerId);
    res.json({ success: true, passenger });
  } catch (err) {
    next(err);
  }
}
