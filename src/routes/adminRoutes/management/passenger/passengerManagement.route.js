import { Router } from "express";
import { authenticateAdmin } from "../../../../middleware/auth.middleware.js";
import { getAllPassengersController, getPassengerByIdController, updatePassengerStatusController }
from "../../../../controllers/admin/management/passengerManagement/passenger.management.controller.js";

const router = Router();


//admin get all passengers
router.get("/get-all", authenticateAdmin, getAllPassengersController);


//admin update passenger status
router.get("/get/:passengerId", authenticateAdmin, getPassengerByIdController);

//admin update passenger status
router.put("/update-status/:passengerId", authenticateAdmin , updatePassengerStatusController);


export default router;
