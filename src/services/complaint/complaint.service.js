import { Complaint } from '../../models/complaint/complaint.model.js';

//------------------ Create Complaint ------------------
export const createComplaintService = async (complaintData) => {
  const complaint = await Complaint.create(complaintData);
  return complaint;
};

//------------------ Get Complaint By ID ------------------
export const getComplaintByIdService = async (id) => {
  const complaint = await Complaint.findById(id)
    .populate('raisedBy', 'name email phone')
    .populate('against', 'name email phone')
    .populate('rideId', 'pickupLocation dropoffLocation fare');
  
  if (!complaint) {
    const error = new Error('Complaint not found');
    error.statusCode = 404;
    throw error;
  }
  return complaint;
};

//------------------ Update Complaint Status ------------------
export const updateComplaintStatusService = async (id, updateData) => {
  const updateFields = { status: updateData.status };
  
  if (['RESOLVED', 'CLOSED'].includes(updateData.status)) {
    updateFields.adminResponse = updateData.adminResponse;
    updateFields.resolvedAt = new Date();
  }

  const updatedComplaint = await Complaint.findByIdAndUpdate(
    id,
    updateFields,
    { new: true, runValidators: true }
  );

  if (!updatedComplaint) {
    const error = new Error('Complaint not found');
    error.statusCode = 404;
    throw error
  }
  
  return updatedComplaint;
};

//------------------ Get All Complaints ------------------
export const getComplaintsService = async (filter, options) => {
  const { page = 1, limit = 5 } = options;
  const skip = (page - 1) * limit;

  // Build the query
  const query = {};
  if (filter.status) query.status = filter.status;
  if (filter.raisedBy) query.raisedBy = filter.raisedBy;
  if (filter.category) query.category = filter.category;

  const complaintsPromise = Complaint.find(query)
    .populate('raisedBy', 'name email')
    .populate('against', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const countPromise = Complaint.countDocuments(query);

  const [complaints, total] = await Promise.all([complaintsPromise, countPromise]);

  const totalPages = Math.ceil(total / limit);
  
  return {
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    },
    data: complaints
  };
};

//------------------ Get Complaint For Specific User ------------------
export const getMyComplaintsService = async (userId, options) => {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  const query = { raisedBy: userId };
  
  const complaintsPromise = Complaint.find(query)
    .populate('against', 'name email')
    .populate('rideId', 'pickupLocation dropoffLocation')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const countPromise = Complaint.countDocuments(query);

  const [complaints, total] = await Promise.all([complaintsPromise, countPromise]);

  const totalPages = Math.ceil(total / limit);
  
  return {
    data: complaints,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  };
};