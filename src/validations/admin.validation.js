import { body } from 'express-validator';
import { ADMIN_ROLES } from '../models/admin/admin.model.js';

export const validateRegister = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password min length 6'),
  body('name').isLength({ min: 2 }).withMessage('Name is required'),
  body('contactNumber').optional().isString(),
  body('gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Invalid gender'),
  body('role').optional().isIn(ADMIN_ROLES).withMessage('Invalid role'),
];

export const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isString().withMessage('Password is required'),
];

export const validateSendOtp = [
  body('contactNumber')
    .isString().withMessage('contactNumber must be a string')
    .matches(/^\d{10,15}$/).withMessage('contactNumber must be 10-15 digits'),
];

export const validateOtpLogin = [
  body('contactNumber')
    .isString().withMessage('contactNumber must be a string')
    .matches(/^\d{10,15}$/).withMessage('contactNumber must be 10-15 digits'),
  body('otp')
    .isString().withMessage('otp must be a string')
    .isLength({ min: 4, max: 8 }).withMessage('otp length invalid'),
];
export const validateEmailOtp = [
  body('email').isEmail().withMessage('Valid email is required'),
];