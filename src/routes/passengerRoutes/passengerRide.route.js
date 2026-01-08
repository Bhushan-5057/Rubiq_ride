import { Router } from "express";
import { authenticatePassenger } from "../../middleware/auth.middleware.js";
import { createRide,cancelRide, updateRide,endRide, getPassengerCancellationReasons } from "../../controllers/ride/passenger/ride/passengerRide.controller.js";
import { getPassengerRides, getRideStatus,getPassengerRideById } from "../../controllers/ride/passenger/rideStatus/getRideStatus.controller.js";

const router = Router()

//--------------------- Get All Rides For Passenger --------------------- 
router.get("/all", authenticatePassenger, getPassengerRides);

//---------------------- Create Ride For Passenger ----------------------
router.post("/create", authenticatePassenger, createRide);

//-------------------- End Ride Route --------------------
router.post("/end-ride", authenticatePassenger, endRide);

//---------------------- Get Cancel Reasons ---------------------- 
router.get("/cancel-reasons", authenticatePassenger, getPassengerCancellationReasons);

//---------------------- Cancel Ride Route ---------------------- 
router.post("/cancel-ride", authenticatePassenger, cancelRide);

//---------------------- Update Ride Route ---------------------- 
router.put("/:rideId", authenticatePassenger, updateRide);

//--------------------- Get Ride Status --------------------- 
router.get("/status/:rideId", authenticatePassenger, getRideStatus);

//--------------------- Get Ride By ID For Passenger --------------------- 
router.get("/:rideId", authenticatePassenger, getPassengerRideById);

export default router;