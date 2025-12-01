import express from "express";
import {
  updateDriverLocation,
  acceptRide,
  rejectRide,
  startRide,
  completeRide,
  givePassengerFeedback
} from "../../../../controllers/ride/driver/driverRide.controller.js";
import { authenticateDriver } from "../../../../middleware/auth.middleware.js";
import { getAllRidesForDriver, getRideById, } from "../../../../controllers/driver/driverManagment/driverManagement.controller.js"

const router = express.Router();

// Driver get all rides
router.get("/rides", authenticateDriver, getAllRidesForDriver);

// Driver get ride by id
router.get("/:rideId", authenticateDriver, getRideById);

//update location for driver 
router.post("/update-location", authenticateDriver, updateDriverLocation);

// Accept a ride request
router.post("/accept-ride", authenticateDriver, acceptRide);

// Start a ride (after arriving at pickup)
router.post("/start-ride", authenticateDriver, startRide);

// Complete a ride
router.post("/complete-ride", authenticateDriver, completeRide);

// Reject a ride request
router.post("/reject-ride", authenticateDriver, rejectRide);

// Give feedback to passenger
router.post("/give-passenger-feedback", authenticateDriver, givePassengerFeedback);

export default router;