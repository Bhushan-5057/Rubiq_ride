import { Router } from "express";
import { authenticatePassenger } from "../../../../middleware/auth.middleware.js";
import { createRide,cancelRide, updateRide,giveDriverFeedback,endRide  } from "../../../../controllers/ride/passenger/ride/passengerRide.controller.js";
import { getPassengerRides, getRideStatus } from "../../../../controllers/ride/passenger/rideStatus/getRideStatus.controller.js";

const router = Router()

//get ride history for passenger route  
router.get("/all", authenticatePassenger, getPassengerRides);

//passenger create ride route
router.post("/create", authenticatePassenger, createRide);

//get ride creation route  
router.get("/:rideId/status", authenticatePassenger, getRideStatus);

//passenger update ride route
router.put("/:rideId", authenticatePassenger, updateRide);

//passenger ride cancellation route 
router.post("/:rideId/cancel", authenticatePassenger, cancelRide);

//passenger end ride route
router.post("/end-ride", authenticatePassenger, endRide);

//passenger give feedback to driver route
router.post("/give-driver-feedback", authenticatePassenger, giveDriverFeedback);

export default router;