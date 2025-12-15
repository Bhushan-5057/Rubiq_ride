import { authenticateAdmin, authenticateUser } from '../../middleware/auth.middleware.js';
import { Router } from 'express';
import {validate} from "../../middleware/validate.js"
import {
  createComplaintValidation,
  updateComplaintStatusValidation,
} from '../../validations/complaint.validation.js';
import {
  createComplaint,
  getComplaint,
  updateComplaintStatus,
  getComplaints,
  getMyComplaints
} from "../../controllers/complaint/complaint.controller.js"
const router = Router();

//----------------- Create a new complaint (Passenger or Driver) -----------------
router.post('/create', authenticateUser, createComplaintValidation, validate,createComplaint);

//------------------- Get a specific complaint (Passenger or Driver) -------------------
router.get('/get/:complaintId', authenticateUser, getComplaint);

//------------------------ Get all complaints (Admin only) ------------------------
router.get('/get-all', authenticateAdmin, getComplaints);

//-------------------- Get my complaints (Passenger or Driver) --------------------
router.get('/my-complaints', authenticateUser, getMyComplaints);

//---------------------- Update complaint status (Admin only) ----------------------
router.put('/status/:complaintId', authenticateAdmin, updateComplaintStatusValidation, updateComplaintStatus);

export const complaintRoutes = router;
