import { Router } from "express";
import { getAllPassengersController, getPassengerByIdController, updatePassengerActiveStatusController, updatePassengerStatusController }
    from "../../controllers/admin/management/passengerManagement/passenger.management.controller.js";
import { authorizeAdmin, authenticateAdmin } from "../../middleware/auth.middleware.js";
import { validateLifecycleStatusUpdate, validateStatusUpdate } from "../../validations/admin.validation.js";
import { validate } from "../../middleware/validate.js";
import { ROLE_PERMISSIONS } from "../../constants/userStatus.constants.js";

const router = Router();

//admin get all passengers
router.get("/get-all", authenticateAdmin, authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_PASSENGERS), getAllPassengersController);

//admin update passenger status
router.get("/get/:passengerId", authenticateAdmin, authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_PASSENGERS), getPassengerByIdController);

//admin update passenger status
router.put("/update-status/:passengerId", authenticateAdmin, authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_PASSENGERS), validateLifecycleStatusUpdate, validate, updatePassengerStatusController);
router.patch("/status/:passengerId", authenticateAdmin, authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_PASSENGERS), validateStatusUpdate, validate, updatePassengerActiveStatusController);


export default router;
