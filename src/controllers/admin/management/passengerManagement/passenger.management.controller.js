import { getPassengerById,getAllPassenger, updatePassangerStatus, } from "../../../../services/adminServices/index.js";

//-------------------------------- Update Passenger Status -------------------------------- 
export async function updatePassengerStatusController(req, res, next) {
  try {
    if (req.admin.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can update passenger status" });
    }

    const { passengerId } = req.params; 
    const { status } = req.body; 

    if (!["active","deactive"].includes(status)) {
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

    const result = await getAllPassenger({
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