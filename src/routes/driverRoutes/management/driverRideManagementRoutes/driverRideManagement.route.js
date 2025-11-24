import express from "express";
import { updateDriverLocation,acceptRide, rejectRide,startRide,completeRide } from "../../../../controllers/ride/driver/driverRide.controller.js";
import { authenticateDriver } from "../../../../middleware/auth.middleware.js";

const router = express.Router();
//driver update location
router.post("/update-location",authenticateDriver, updateDriverLocation);

// Other ride management routes can be added here
router.post("/accept-ride",authenticateDriver,acceptRide ); 

//driver start ride
router.post("/start-ride",authenticateDriver,startRide );

router.post("/complete-ride",authenticateDriver,completeRide );

//driver reject ride
router.post("/reject-ride",authenticateDriver,rejectRide );

export default router;