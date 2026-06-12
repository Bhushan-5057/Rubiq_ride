import {
  createComplaintService,
  getComplaintByIdService,
  getComplaintsService,
  updateComplaintStatusService,
  getMyComplaintsService
} from '../../services/complaint/complaint.service.js';

const getUserModelName = (role) => {
  if (role === 'passenger') return 'Passenger';
  if (role === 'driver') return 'Driver';
  return role;
};

//-------------------------- Create Complaint --------------------------
export const createComplaint = async (req, res, next) => {
  try {
    const complaintData = {
      ...req.body,
      raisedBy: req.user.id,
      raisedByUser: getUserModelName(req.user.role)
    };

    const complaint = await createComplaintService(complaintData);
    res.status(201).json({
      success: true,
      message:"Complaint created successfully",
      data: complaint
    });
  } catch (error) {
    next(error);
  }
};

//-------------------------- Get Complaint by ID --------------------------
export const getComplaint = async (req, res, next) => {
  try {
    const complaint = await getComplaintByIdService(req.params.complaintId);
    const isAdmin = Boolean(req.admin);
    const isOwner = req.user && complaint.raisedBy._id.toString() === req.user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      message:"Complaint fetched successfully",
      data: complaint
    });
  } catch (error) {
    next(error);
  }
};

//-------------------------- Update Complaint Status --------------------------
export const updateComplaintStatus = async (req, res, next) => {
  try {
    const updatedComplaint = await updateComplaintStatusService(
      req.params.complaintId,
      req.body
    );

    res.json({
      success: true,
      message:"Complaint status updated successfully",
      data: updatedComplaint
    });
  } catch (error) {
    next(error);
  }
};

//-------------------------- Get All Complaints --------------------------
export const getComplaints = async (req, res, next) => {
  try {
    const filter = { ...req.query }
    const options = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 5,
    }
    const result = await getComplaintsService(filter, options);
    res.json({
      success: true,
      message:"Complaints fetched successfully",
      data: result
    })
  } catch (error) {
    next(error);
  }
};

//-------------------------- Get Pecific User Complaint --------------------------
export const getMyComplaints = async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 10,
    };
    const result = await getMyComplaintsService(req.user.id, options);
    res.json({
      success: true,
      message:"User complaints fetched successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};
