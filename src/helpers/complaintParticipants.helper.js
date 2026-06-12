const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const normalizeRole = (role) => String(role || '').toLowerCase();

const toIdString = (value) => {
  if (!value) return null;
  return (value._id || value).toString();
};

export const validateComplaintParticipants = ({
  ride,
  raisedBy,
  raisedByRole,
  against,
  targetType
}) => {
  const raisedById = toIdString(raisedBy);
  const passengerId = toIdString(ride?.passenger);
  const driverId = toIdString(ride?.driver);
  const againstId = toIdString(against);
  const role = normalizeRole(raisedByRole);

  const isPassengerCreator = role === 'passenger';
  const isDriverCreator = role === 'driver';

  if (
    (isPassengerCreator && passengerId !== raisedById) ||
    (isDriverCreator && driverId !== raisedById) ||
    (!isPassengerCreator && !isDriverCreator)
  ) {
    throw createError('You are not authorized to raise a complaint for this ride', 403);
  }

  if (targetType === 'System') {
    return;
  }

  if (againstId && againstId === raisedById) {
    throw createError('You cannot raise a complaint against yourself', 400);
  }

  const isValidTarget =
    (isPassengerCreator && targetType === 'Driver' && driverId === againstId) ||
    (isDriverCreator && targetType === 'Passenger' && passengerId === againstId);

  if (!isValidTarget) {
    throw createError('Invalid complaint target for this ride', 403);
  }
};
