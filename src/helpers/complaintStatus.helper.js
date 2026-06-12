export const COMPLAINT_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED'
];

const complaintStatusOrder = COMPLAINT_STATUSES.reduce((order, status, index) => {
  order[status] = index;
  return order;
}, {});

export const isValidComplaintStatusTransition = (currentStatus, nextStatus) => {
  if (!COMPLAINT_STATUSES.includes(currentStatus) || !COMPLAINT_STATUSES.includes(nextStatus)) {
    return false;
  }

  return complaintStatusOrder[nextStatus] === complaintStatusOrder[currentStatus] + 1;
};

export const validateComplaintStatusTransition = (currentStatus, nextStatus) => {
  if (
    currentStatus === nextStatus ||
    !isValidComplaintStatusTransition(currentStatus, nextStatus)
  ) {
    const error = new Error('Invalid status transition');
    error.status = 400;
    throw error;
  }
};
