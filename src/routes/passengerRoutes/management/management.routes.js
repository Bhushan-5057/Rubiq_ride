import { Router } from "express";
import { authenticatePassenger } from "../../../middleware/auth.middleware.js";
import { deletePassengerController } from "../../../controllers/passenger/passengerManagment/passengerManagement.controller.js";
import rideCreationRoutes from "./ride/create.ride.route.js";

const router = Router();

//passenger delete self account
router.delete("/delete/:passengerId", authenticatePassenger, deletePassengerController);

//passenger ride creation routes
router.use("/passenger-ride",authenticatePassenger , rideCreationRoutes );

export default router;