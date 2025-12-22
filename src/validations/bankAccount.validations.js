import { body, param, query } from 'express-validator';

// Validation for adding/updating bank account
export const bankAccountValidation = [
  body('accountHolderName')
    .trim()
    .notEmpty().withMessage('Account holder name is required')
    .isLength({ min: 2 }).withMessage('Account holder name must be at least 2 characters long')
    .isLength({ max: 100 }).withMessage('Account holder name cannot exceed 100 characters'),
    
  body('bankName')
    .trim()
    .notEmpty().withMessage('Bank name is required')
    .isLength({ min: 2 }).withMessage('Bank name must be at least 2 characters long')
    .isLength({ max: 100 }).withMessage('Bank name cannot exceed 100 characters'),
    
  body('accountNumber')
    .notEmpty().withMessage('Account number is required')
    .matches(/^[0-9]{9,18}$/).withMessage('Please enter a valid account number (9-18 digits)'),
    
  body('ifscCode')
    .notEmpty().withMessage('IFSC code is required')
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i).withMessage('Please enter a valid IFSC code')
    .toUpperCase(),
    
  body('branchName')
    .trim()
    .notEmpty().withMessage('Branch name is required')
    .isLength({ max: 100 }).withMessage('Branch name cannot exceed 100 characters')
];

