
import { Router } from "express";
import { authenticatePassenger } from "../../../../middleware/auth.middleware.js";
import { createRide,cancelRide, updateRide  } from "../../../../controllers/ride/passenger/ride/passengerRide.controller.js";
import { getPassengerRides, getRideStatus } from "../../../../controllers/ride/passenger/rideStatus/getRideStatus.controller.js";

const router = Router()
//passenger create ride
router.post("/create", authenticatePassenger, createRide);

//get ride history for passenger can be added here
router.get("/all", authenticatePassenger, getPassengerRides);

//update ride for passenger
router.put("/:rideId", authenticatePassenger, updateRide);

//get ride creation route can be added here
router.get("/:rideId/status", authenticatePassenger, getRideStatus);

//ride cancellation route can be added here
router.post("/:rideId/cancel", authenticatePassenger, cancelRide);

export default router;
