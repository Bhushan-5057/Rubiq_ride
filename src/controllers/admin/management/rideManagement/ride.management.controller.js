import { archiveAllRidesService, archiveRideService, getAllRidesService,getSingleRideService } 
from "../../../../services/rideServices/adminRideServices/adminRide.service.js"; 

//--------------------- Get Ride by ID controller --------------------- 
export const getRideById = async (req, res) => {
  try {
    const { rideId } = req.params;
    if (!rideId) throw new Error("Ride ID is required");  
    const rides = await getSingleRideService(rideId);
    res.status(200).json({
      status: true,
      message: "Ride fetched successfully",
      data: rides,
    });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
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
      status: true,
      message: "Rides fetched successfully",
      pagination: result.pagination,
      data: result.data
    });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
};

// --------------------------------- Archive Ride Controller ---------------------------------
export const archiveRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    if (!rideId) throw new Error("Ride ID is required");

    const ride = await archiveRideService(rideId);

    res.status(200).json({ status: true, message: "Ride deactivated successfully", data: ride });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
};


// ---------------------------------- Archive All Rides ----------------------------------
export const archiveAllRides = async (req, res) => {
  try {
    const archivedCount = await archiveAllRidesService();

    res.status(200).json({
      status: true,
      message: `${archivedCount} rides deactivated successfully`,
    });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
};
