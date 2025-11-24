import express from "express";
import { updateDriverLocation,acceptRide, rejectRide,startRide,completeRide ,getAllRidesForDriver,getRideById,driverArrived,driverOnTheWay,givePassengerFeedback} from "../../../../controllers/ride/driver/driverRide.controller.js";
import { authenticateDriver } from "../../../../middleware/auth.middleware.js";

const router = express.Router();

//driver get all rides
router.get("/rides",authenticateDriver, getAllRidesForDriver);

//driver get ride by id
router.get("/:rideId",authenticateDriver, getRideById);

//driver update location
router.post("/update-location",authenticateDriver, updateDriverLocation);

// Other ride management routes can be added here
router.post("/accept-ride",authenticateDriver,acceptRide ); 

//driver start ride
router.post("/start-ride",authenticateDriver,startRide );

//driver complete ride
router.post("/complete-ride",authenticateDriver,completeRide );

//driver reject ride
router.post("/reject-ride",authenticateDriver,rejectRide );

//driver arrived at pickup location
router.post("/driver-arrived",authenticateDriver,driverArrived );

//driver on the way to pickup location
router.post("/driver-on-the-way",authenticateDriver,driverOnTheWay );

//driver give feedback to passenger
router.post("/give-passenger-feedback",authenticateDriver,givePassengerFeedback );

export default router;