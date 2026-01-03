import express from "express";
import { 
  submitDriverFeedback, 
  submitPassengerFeedback, 
  getMyFeedback, 
  getUserFeedback, 
  getRideFeedback 
} from "../../controllers/feedback/feedback.controller.js";
import { authenticateDriver,authenticatePassenger,authenticateAdmin ,authenticateUser} from "../../middleware/auth.middleware.js";
import { authorizeAdmin } from "../../middleware/auth.middleware.js";

const router = express.Router();

// Driver feedback submission (from passenger)
router.post("/driver-feedback", authenticatePassenger, submitDriverFeedback);

// Passenger feedback submission (from driver)
router.post("/passenger-feedback", authenticateDriver,  submitPassengerFeedback);

// Get feedback for the currently authenticated user
router.get("/me", authenticateUser, getMyFeedback);

// Get feedback for a specific user (admin only)
router.get("/user/:userId", authenticateAdmin,authorizeAdmin("super_admin","admin"), getUserFeedback);

// Get feedback for a specific ride
router.get("/ride/:rideId", authenticateUser, getRideFeedback);

export default router;
