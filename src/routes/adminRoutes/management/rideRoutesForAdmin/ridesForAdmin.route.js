import { Router } from "express";
import { authenticateAdmin } from "../../../../middleware/auth.middleware.js";
import { deleteAllRides, deleteRide, getAllRides, getRideById, } from "../../../../controllers/admin/management/rideManagement/ride.management.controller.js";
import { authorizeAdmin } from "../../../../middleware/auth.middleware.js";

const router = Router();

// Admin fetch all rides
router.get("/get-all", authenticateAdmin,authorizeAdmin("super_admin","admin"), getAllRides);

// Admin fetch one ride
router.get("/:rideId", authenticateAdmin,authorizeAdmin("super_admin","admin"), getRideById);

//delete all rides route can be added here
router.delete("/delete-all", authenticateAdmin,authorizeAdmin("super_admin","admin"), deleteAllRides);

//delete rides
router.delete("/:rideId", authenticateAdmin,authorizeAdmin("super_admin","admin"), deleteRide);


export default router;
