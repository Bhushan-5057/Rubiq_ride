import { body, param, query } from "express-validator";

export const otpLoginValidation = [
  body("contactNumber")
    .exists()
    .isLength({ min: 10, max: 15 })
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
    .isLength({ min: 10, max: 15 })
    .withMessage("Contact number is required")
    .isMobilePhone("en-IN")
    .withMessage("Invalid contact number"),
];

export const getPassengerQueryValidation = [
  query("city").optional().isString().trim(),
  query("status")
    .optional()
    .isIn(["active", "deactive"])
    .withMessage("Invalid status filter"),
];
