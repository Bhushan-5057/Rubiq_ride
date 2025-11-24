import { Router } from "express";
import { authenticateAdmin } from "../../../../middleware/auth.middleware.js";
import { deleteAllRides, deleteRide, getAllRides, getRideById, } from "../../../../controllers/admin/management/rideManagement/ride.management.controller.js";

const router = Router();

// Admin fetch all rides
router.get("/get-all", authenticateAdmin, getAllRides);

// Admin fetch one ride
router.get("/:rideId", authenticateAdmin, getRideById);

//delete all rides route can be added here
router.delete("/delete-all", authenticateAdmin, deleteAllRides);

//delete rides
router.delete("/:rideId", authenticateAdmin, deleteRide);


export default router;
