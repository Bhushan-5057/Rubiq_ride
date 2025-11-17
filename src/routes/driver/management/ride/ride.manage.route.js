import express from "express";
import { updateDriverLocation } from "../../../../controllers/driver/managment/ride/driver.ride.controller.js";
import { authenticateDriver } from "../../../../middleware/auth.middleware.js";
import { acceptRide, rejectRide } from "../../../../controllers/ride/managment/driver/driver.ride.controller.js";


const router = express.Router();
//driver update location
router.post("/update-location",authenticateDriver, updateDriverLocation);

// Other ride management routes can be added here
router.post("/accept-ride",authenticateDriver,acceptRide ); 

//driver reject ride
router.post("/reject-ride",authenticateDriver,rejectRide );

export default router;