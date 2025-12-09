import { Router } from "express";
import { authenticatePassenger } from "../../../middleware/auth.middleware.js";
import { deletePassengerController } from "../../../controllers/passenger/passengerManagment/passengerManagement.controller.js";
import rideCreationRoutes from "./ride/create.ride.route.js";

const router = Router();

//--------------------- Passenger Delete Route ---------------------
router.delete("/delete/:passengerId", authenticatePassenger, deletePassengerController);

//------------------- Passenger Ride Create Route
router.use("/passenger-ride",authenticatePassenger , rideCreationRoutes );

export default router;