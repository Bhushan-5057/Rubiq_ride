import { deleteAllRidesService, deleteRideService, getAllRidesService,getSingleRideService } 
from "../../../../services/rideServices/adminRideServices/adminRide.service.js"; 

//--------------------- Get Ride by ID controller --------------------- 
export const getRideById = async (req, res) => {
  try {
    const { rideId } = req.params;
    if (!rideId) throw new Error("Ride ID is required");  
    const rides = await getSingleRideService(rideId);
    res.status(200).json({
      success: true,
      rides,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }

}

//------------------------- Get All Rides Controller -------------------------  
export const getAllRides = async (req, res) => {
  try {
    // Extract query parameters
    const { 
      page = 1, 
      limit = 5, 
      status, 
      search, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;

    // Validate page and limit
    const pageNum = Math.max(1, parseInt(page)) || 1;
    const limitNum = Math.max(1, parseInt(limit)) || 5;

    // Call service with filters
    const result = await getAllRidesService({
      page: pageNum,
      limit: limitNum,
      status,
      search,
      sortBy,
      sortOrder,
      startDate,
      endDate
    });

    res.status(200).json({
      success: true,
      pagination: result.pagination,
      data: result.data
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// --------------------------------- Delete Ride Controller --------------------------------- 
export const deleteRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    if (!rideId) throw new Error("Ride ID is required");

    await deleteRideService(rideId);

    res.status(200).json({ success: true, message: "Ride deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


// ---------------------------------- Delete All Rides ---------------------------------- 
export const deleteAllRides = async (req, res) => {
  try {
    const deletedCount = await deleteAllRidesService();

    res.status(200).json({
      success: true,
      message: `${deletedCount} rides deleted successfully`,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};