import { getPassengerAllRideService, getPassengerRideByIdService, getRideStatusService } from "../../../../services/passengerServices/index.js";

//-------------------------------- Get Ride Status --------------------------------

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

//----------------------------- Get All Rides -----------------------------

export const getPassengerRides = async (req, res) => {
  try {
    const passengerId = req.passenger._id; 
    const rides = await getPassengerAllRideService(passengerId);

    res.status(200).json({ success: true, rides });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}; 

//---------------------------- Get Ride By Id For Passenger ----------------------------

export const getPassengerRideById = async (req, res, next) => {
  try {
    const passengerId = req.passenger._id
    const { rideId } = req.params
    const ride = await getPassengerRideByIdService(rideId, passengerId)
    res.status(200).json({
      success: true,
      message: "Passenger Ride Data Fetched Successfully",
      data: ride
    })
  } catch (error) {
    next(error)
  }
}