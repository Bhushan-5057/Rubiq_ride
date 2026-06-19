import { Router } from "express";
import {
  authenticateAdmin,
  authorizeAdmin,
} from "../../middleware/auth.middleware.js";
import {
  archiveAllRides,
  archiveRide,
  getAllRides,
  getRideById,
} from "../../controllers/admin/management/rideManagement/ride.management.controller.js";
import { ROLE_PERMISSIONS } from "../../constants/userStatus.constants.js";

const router = Router();

// Admin fetch all rides
router.get(
  "/get-all",
  authenticateAdmin,
  authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_RIDES),
  getAllRides,
);

// Admin fetch one ride
router.get(
  "/:rideId",
  authenticateAdmin,
  authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_RIDES),
  getRideById,
);

// Deactivate all rides without physically deleting records.
router.patch(
  "/status/deactivate-all",
  authenticateAdmin,
  authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_RIDES),
  archiveAllRides,
);

// Deactivate a ride without physically deleting the record.
router.patch(
  "/status/:rideId",
  authenticateAdmin,
  authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_RIDES),
  archiveRide,
);

export default router;
