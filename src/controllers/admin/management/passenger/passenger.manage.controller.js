import { Passenger } from "../../../../models/passengers/Passenger.model.js";
import { getPassengerById, updatePassangerStatus } from "../../../../services/passenger/index.js";

export async function updatePassengerStatusController(req, res, next) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can update passenger status" });
    }

    const { passengerId } = req.params; 
    const { status } = req.body; 

    if (!["active", "suspended"].includes(status)) {
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
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Only admins can access this resource" });
    }

    const passengers = await Passenger.find().sort({ createdAt: -1 });
    const sanitizedPassengers = passengers.map(p => p);

    res.json({
      success: true,
      message: "All passengers fetched successfully",
      passengers: sanitizedPassengers,
    });
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
