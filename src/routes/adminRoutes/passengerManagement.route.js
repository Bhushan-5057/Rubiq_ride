import { Router } from "express";
import { getAllPassengersController, getPassengerByIdController, updatePassengerStatusController }
    from "../../controllers/admin/management/passengerManagement/passenger.management.controller.js";
import { authorizeAdmin, authenticateAdmin } from "../../middleware/auth.middleware.js";

const router = Router();

//admin get all passengers
router.get("/get-all", authenticateAdmin, authorizeAdmin("super_admin", "admin"), getAllPassengersController);

//admin update passenger status
router.get("/get/:passengerId", authenticateAdmin, authorizeAdmin("super_admin", "admin"), getPassengerByIdController);

//admin update passenger status
router.put("/update-status/:passengerId", authenticateAdmin, authorizeAdmin("super_admin", "admin"), updatePassengerStatusController);


export default router;
