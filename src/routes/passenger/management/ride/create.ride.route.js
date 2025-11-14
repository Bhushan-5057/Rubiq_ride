
import { Router } from "express";
import { authenticatePassenger } from "../../../../middleware/auth.middleware.js";
import { createRide } from "../../../../controllers/ride/managment/passenger/create.ride.controller.js";
import { getPassengerRides, getRideStatus } from "../../../../controllers/ride/managment/passenger/rideStatus/getRideStatus.controller.js";
import { cancelRide } from "../../../../controllers/ride/managment/passenger/rideStatus/cancelride/cancelRide.controller.js";

const router = Router()
//passenger create ride
router.post("/create", authenticatePassenger, createRide);

//get ride history for passenger can be added here
router.get("/all", authenticatePassenger, getPassengerRides);

//get ride creation route can be added here
router.get("/:rideId/status", authenticatePassenger, getRideStatus);

//ride cancellation route can be added here
router.post("/:rideId/cancel", authenticatePassenger, cancelRide);

export default router;
