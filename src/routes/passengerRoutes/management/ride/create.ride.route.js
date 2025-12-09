import { Router } from "express";
import { authenticatePassenger } from "../../../../middleware/auth.middleware.js";
import { createRide,cancelRide, updateRide,endRide  } from "../../../../controllers/ride/passenger/ride/passengerRide.controller.js";
import { getPassengerRides, getRideStatus } from "../../../../controllers/ride/passenger/rideStatus/getRideStatus.controller.js";

const router = Router()

//--------------------- Get All Rides For Passenger --------------------- 
router.get("/all", authenticatePassenger, getPassengerRides);

//---------------------- Create Ride For Passenger ----------------------
router.post("/create", authenticatePassenger, createRide);

//--------------------- Get Ride Status --------------------- 
router.get("/status/:rideId", authenticatePassenger, getRideStatus);

//---------------------- Update Ride Route ---------------------- 
router.put("/:rideId", authenticatePassenger, updateRide);

//---------------------- Cancel Ride Route ---------------------- 
router.post("/cancel/:rideId", authenticatePassenger, cancelRide);

//-------------------- End Ride Route --------------------
router.post("/end-ride", authenticatePassenger, endRide);

export default router;