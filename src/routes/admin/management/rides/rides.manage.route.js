import { Router } from "express";
import { authenticateAdmin } from "../../../../middleware/auth.middleware.js";
import { deleteAllRides, deleteRide, getAllRides } from "../../../../controllers/admin/management/rides/managment/ride.manage.controller.js";

const router = Router();

// Admin fetch all rides
router.get("/get-all", authenticateAdmin, getAllRides);


//delete all rides route can be added here
router.delete("/delete-all", authenticateAdmin, deleteAllRides);

//delete ride
router.delete("/:rideId", authenticateAdmin, deleteRide);


export default router;
