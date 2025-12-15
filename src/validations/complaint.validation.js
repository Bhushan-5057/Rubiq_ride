import { body, query, param } from 'express-validator';

const complaintCategories = [
  'PAYMENT',
  'BEHAVIOR',
  'LATE_PICKUP',
  'WRONG_ROUTE',
  'APP_ISSUE',
  'OTHER'
];

const complaintStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

//-------------------------- Create Complaint Validation --------------------------
export const createComplaintValidation = [

  body('targetType')
    .notEmpty().withMessage('targetType is required')
    .isIn(['Passenger', 'Driver', 'System']).withMessage('Invalid targetType'),

  body('against')
    .if(body('targetType').isIn(['Passenger', 'Driver']))
    .notEmpty().withMessage('against is required when targetType is Passenger or Driver')
    .isMongoId().withMessage('Invalid against ID format'),

  body('againstUser')
    .if(body('targetType').isIn(['Passenger', 'Driver']))
    .notEmpty().withMessage('againstUser is required when targetType is Passenger or Driver')
    .isIn(['Passenger', 'Driver']).withMessage('Invalid againstUser'),

  body('rideId')
    .if(body('targetType').isIn(['Passenger', 'Driver']))
    .notEmpty().withMessage('rideId is required when targetType is Passenger or Driver')
    .isMongoId().withMessage('Invalid rideId format'),

  body('category')
    .notEmpty().withMessage('category is required')
    .isIn(complaintCategories)
    .withMessage(`Invalid category. Must be one of: ${complaintCategories.join(', ')}`),

  body('description')
    .notEmpty().withMessage('description is required')
    .isString().withMessage('description must be a string')
    .isLength({ min: 10, max: 1000 })
    .withMessage('description must be between 10 and 1000 characters')
];

//-------------------------- Update Complaint Status Validation --------------------------
export const updateComplaintStatusValidation = [
  param('complaintId')
    .isMongoId().withMessage('Invalid complaint ID'),

  body('status')
    .notEmpty().withMessage('status is required')
    .isIn(complaintStatuses)
    .withMessage(`Invalid status. Must be one of: ${complaintStatuses.join(', ')}`),

  body('adminResponse')
    .if((value, { req }) =>
      ['RESOLVED', 'CLOSED'].includes(req.body.status)
    )
    .notEmpty()
    .withMessage('adminResponse is required when status is RESOLVED or CLOSED')
    .isString()
    .withMessage('adminResponse must be a string')
];
