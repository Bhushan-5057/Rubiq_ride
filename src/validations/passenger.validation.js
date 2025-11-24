import { body, param, query } from "express-validator";

export const registerPassengerValidation = [
  body("name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters long"),
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Invalid email format"),
  body("phone")
    .exists()
    .withMessage("Phone number is required")
    .isMobilePhone("en-IN")
    .withMessage("Invalid Indian mobile number format"),
];

export const otpLoginValidation = [
  body("contactNumber")
    .exists()
    .withMessage("Contact number is required")
    .isMobilePhone("en-IN")
    .withMessage("Invalid phone number"),
  body("otp")
    .exists()
    .withMessage("OTP is required")
    .isLength({ min: 4, max: 6 })
    .withMessage("OTP must be between 4 to 6 digits"),
];

export const updatePassengerValidation = [
  body("name").optional().isString().trim(),
  body("email").optional().isEmail().withMessage("Invalid email format"),
  body("gender")
    .optional()
    .isIn(["male", "female", "other"])
    .withMessage("Invalid gender value"),
  body("city")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2 })
    .withMessage("City must be valid"),
  body("profileImage").optional().isURL().withMessage("Invalid profile image URL"),
];

export const passengerIdParamValidation = [
  param("id").isMongoId().withMessage("Invalid passenger ID format"),
];

export const otpSendValidation = [
  body("contactNumber")
    .exists()
    .withMessage("Contact number is required")
    .isMobilePhone("en-IN")
    .withMessage("Invalid phone number"),
];

export const getPassengerQueryValidation = [
  query("city").optional().isString().trim(),
  query("status")
    .optional()
    .isIn(["active", "deactive", "suspended"])
    .withMessage("Invalid status filter"),
];
