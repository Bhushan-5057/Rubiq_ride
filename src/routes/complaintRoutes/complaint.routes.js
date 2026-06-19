import {
  authenticateAdmin,
  authenticateUser,
} from "../../middleware/auth.middleware.js";
import express from "express";
import { validate } from "../../middleware/validate.js";
import {
  createComplaintValidation,
  getComplaintValidation,
  getComplaintsValidation,
  updateComplaintStatusValidation,
} from "../../validations/complaint.validation.js";
import {
  createComplaint,
  getComplaint,
  updateComplaintStatus,
  getComplaints,
  getMyComplaints,
} from "../../controllers/complaint/complaint.controller.js";
import { authorizeAdmin } from "../../middleware/auth.middleware.js";
const router = express.Router();
export const adminComplaintRouter = express.Router();

//----------------- Create a new complaint (Passenger or Driver) -----------------
router.post(
  "/",
  authenticateUser,
  createComplaintValidation,
  validate,
  createComplaint,
);

//-------------------- Get my complaints (Passenger or Driver) --------------------
router.get("/my-complaints", authenticateUser, getMyComplaints);

//------------------- Get a specific complaint (Passenger or Driver) -------------------
router.get(
  "/:complaintId",
  authenticateUser,
  getComplaintValidation,
  validate,
  getComplaint,
);

//------------------------ Get all complaints (Admin only) ------------------------
adminComplaintRouter.get(
  "/",
  authenticateAdmin,
  authorizeAdmin("super_admin", "admin"),
  getComplaintsValidation,
  validate,
  getComplaints,
);

//------------------- Get a specific complaint (Admin only) -------------------
adminComplaintRouter.get(
  "/:complaintId",
  authenticateAdmin,
  authorizeAdmin("super_admin", "admin"),
  getComplaintValidation,
  validate,
  getComplaint,
);

//---------------------- Update complaint status (Admin only) ----------------------
adminComplaintRouter.put(
  "/status/:complaintId",
  authenticateAdmin,
  authorizeAdmin("super_admin", "admin"),
  updateComplaintStatusValidation,
  validate,
  updateComplaintStatus,
);

export default router;
