import { Router } from "express";
import { authenticatePassenger } from "../../middleware/auth.middleware.js";
import rideCreationRoutes from "./passengerRide.route.js";
import { updatePassengerLocation } from "../../controllers/ride/passenger/ride/passengerRide.controller.js";


const router = Router();

//------------------- Passenger Ride Create Route
router.use("/passenger-ride",authenticatePassenger , rideCreationRoutes ); 

//--------------------- Update Passenger Location --------------------- 
router.put("/update-location", authenticatePassenger, updatePassengerLocation);

export default router;
