import { body, query, param } from 'express-validator';
import { COMPLAINT_STATUSES } from '../helpers/complaintStatus.helper.js';

const complaintCategories = [
  'PAYMENT',
  'BEHAVIOUR',
  'LATE_PICKUP',
  'WRONG_ROUTE',
  'APP_ISSUE',
  'OTHER'
];

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
    .isIn(COMPLAINT_STATUSES)
    .withMessage(`Invalid status. Must be one of: ${COMPLAINT_STATUSES.join(', ')}`),

  body('adminResponse')
    .if((value, { req }) =>
      ['RESOLVED', 'CLOSED'].includes(req.body.status)
    )
    .trim()
    .notEmpty()
    .withMessage('adminResponse is required when status is RESOLVED or CLOSED')
    .isString()
    .withMessage('adminResponse must be a string')
];

//-------------------------- Get Complaint Validation --------------------------
export const getComplaintValidation = [
  param('complaintId')
    .isMongoId().withMessage('Invalid complaint ID')
];

//-------------------------- Get Complaints Validation --------------------------
export const getComplaintsValidation = [
  query('status')
    .optional()
    .isIn(COMPLAINT_STATUSES)
    .withMessage(`Invalid status. Must be one of: ${COMPLAINT_STATUSES.join(', ')}`),

  query('category')
    .optional()
    .isIn(complaintCategories)
    .withMessage(`Invalid category. Must be one of: ${complaintCategories.join(', ')}`),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('limit must be a positive integer')
];
