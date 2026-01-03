import express from 'express';
import { authenticateAdmin, authenticateUser } from '../../middleware/auth.middleware.js';
import {
  addBankAccountController,
  getOwnBankAccountController,
  getBankAccountForAdminController,
  getAllBankAccountsForAdminController,
  verifyBankAccountController,
  updateBankAccountController,
} from '../../controllers/bankAccount/bankAccount.controller.js';
import {
  bankAccountValidation,
} from '../../validations/bankAccount.validations.js'; 
import { authorizeAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

//----------------- User Routes (Driver/Passenger) -----------------//

// Add Bank Account
router.post(
  '/add-bank-account',
  authenticateUser,
  bankAccountValidation,
  addBankAccountController
);

// Get Own Bank Account
router.get(
  '/get-bank-account',
  authenticateUser,
  getOwnBankAccountController
);

// Update Own Bank Account
router.put(
  '/update-bank-details',
  authenticateUser,
  bankAccountValidation,
  updateBankAccountController
);

//----------------- Admin Routes -----------------//

// Get Bank Account for User (Admin)
router.get(
  '/admin/:userId/:userType',
  authenticateAdmin,
  authorizeAdmin("super_admin","admin"),
  getBankAccountForAdminController
);

// Get All Bank Accounts (Admin)
router.get(
  '/admin/get-all-bank-accounts',
  authenticateAdmin,
  authorizeAdmin("super_admin","admin"),
  getAllBankAccountsForAdminController
);

// Verify/Reject Bank Account (Admin)
router.put(
  '/admin/verify-bank-details/:userId/:userType',
  authenticateAdmin,
  authorizeAdmin("super_admin","admin"),
  verifyBankAccountController
);

export default router;