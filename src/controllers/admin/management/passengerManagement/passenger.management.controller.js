import { getPassengerById, getAllPassenger, updatePassengerActiveStatus, updatePassangerStatus } from "../../../../services/adminServices/index.js";
import { sendSuccess } from "../../../../utils/apiResponse.js";

//-------------------------------- Update Passenger Status -------------------------------- 
export async function updatePassengerStatusController(req, res, next) {
  try {
    const { passengerId } = req.params; 
    const { status } = req.body; 

    if (!status) {
      return res.status(400).json({ status: false, message: "status is required" });
    }

    const result = await updatePassangerStatus(passengerId, status);
    return sendSuccess(res, 200, result.message, result.passenger);
  } catch (err) {
    next(err);
  }
}

export async function updatePassengerActiveStatusController(req, res, next) {
  try {
    const { passengerId } = req.params;
    const { isActive } = req.body;

    const result = await updatePassengerActiveStatus(passengerId, isActive);
    return sendSuccess(res, 200, result.message, result.passenger);
  } catch (err) {
    next(err);
  }
}

// -------------------- Get All Passengers --------------------
export async function getAllPassengersController(req, res, next) {
  try {
        // Extract query parameters
    const { 
      page = 1, 
      limit = 5, 
      status,
      isActive,
      search, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    // Validate page and limit
    const pageNum = Math.max(1, parseInt(page)) || 1;
    const limitNum = Math.max(1, parseInt(limit)) || 5;

    const result = await getAllPassenger({
      page: pageNum,
      limit: limitNum,
      status,
      isActive,
      search,
      sortBy,
      sortOrder
    });
    return sendSuccess(res, 200, "Passengers fetched successfully", result.data, { pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

// -------------------- Get Passenger by ID --------------------
export async function getPassengerByIdController(req, res, next) {
  try {
    const { passengerId } = req.params;
    if (!passengerId) return res.status(400).json({ status: false, message: "Passenger ID required" });

    const passenger = await getPassengerById(passengerId);
    return sendSuccess(res, 200, "Passenger fetched successfully", passenger);
  } catch (err) {
    next(err);
  }
}
