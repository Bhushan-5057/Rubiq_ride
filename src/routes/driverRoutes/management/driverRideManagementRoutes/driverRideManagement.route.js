import express from "express";
import {
  updateDriverLocation,
  acceptRide,
  cancelRide,
  driverArrived,
  startRide,
  completeRide,
} from "../../../../controllers/ride/driver/driverTracking.controller.js";
import { authenticateDriver } from "../../../../middleware/auth.middleware.js";
import { getAllRidesForDriver, getRideById, } from "../../../../controllers/driver/driverManagment/driverManagement.controller.js"

const router = express.Router();

//---------------- Driver Get All Rides ----------------
router.get("/rides", authenticateDriver, getAllRidesForDriver);

//---------------- Driver Get Ride By ID ----------------
router.get("/:rideId", authenticateDriver, getRideById);

//---------------- Update Driver Location Route ---------------- 
router.post("/update-location", authenticateDriver, updateDriverLocation);

//---------------- Accept Ride Route ----------------
router.post("/accept-ride", authenticateDriver, acceptRide);

//---------------- Driver Arrived Route ----------------
router.post("/driver-arrived", authenticateDriver, driverArrived);

//---------------- Start Ride Route ----------------
router.post("/start-ride", authenticateDriver, startRide);

//---------------- Complete Ride Route ----------------
router.post("/complete-ride", authenticateDriver, completeRide);

//---------------- Cancel Ride Route ----------------
router.post("/cancel-ride", authenticateDriver,  cancelRide);

export default router;