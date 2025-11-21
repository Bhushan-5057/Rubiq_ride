import { getPassengerAllRideService, getRideStatusService } from "../../../../services/rideServices/passengerRideService/passengerRideStatusService/getRideStatus.service.js";

export const getRideStatus = async (req, res) => {
  try {
    const { rideId } = req.params;
    const passengerId = req.passenger._id;

    const data = await getRideStatusService({ rideId, passengerId });

    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

//get all rides for passenger
export const getPassengerRides = async (req, res) => {
  try {
    const passengerId = req.passenger._id; 
    const rides = await getPassengerAllRideService(passengerId);

    res.status(200).json({ success: true, rides });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
