import { body } from "express-validator";
import { driverDocumentValidation } from "./driverDocument.validation.js";

export const updateProfileValidation = [
  body("name").optional().isString().trim(),
  body("email").optional().isEmail().customSanitizer(value => value.trim().toLowerCase()),
  body("vehicleNumber")
    .optional()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z]{2}(0[1-9]|[1-9][0-9])[A-Z]{1,2}[0-9]{4}$/)
    .withMessage("Invalid vehicle number. Example: GJ05AB1234"),
  body("licenseNumber").optional().isString().trim().toUpperCase(),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .toDate()
    .custom((dob) => {
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();

      const hasHadBirthdayThisYear =
        today.getMonth() > dob.getMonth() ||
        (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

      const actualAge = hasHadBirthdayThisYear ? age : age - 1;

      if (actualAge < 18) {
        throw new Error("Driver must be at least 18 years old");
      }

      return true;
    }),

  body("gender").optional().isIn(["male", "female", "other"]),
  body("vehicleType").optional().isIn(["cab", "bike", "auto"]),
  body("city").optional().isString().trim(),

  ...driverDocumentValidation
];


export const otpSendValidation = [
  body("contactNumber")
    .exists()
    .isLength({ min: 10, max: 15 })
    .withMessage("Contact number is required")
    .isMobilePhone("en-IN")
    .withMessage("Invalid contact number"),
];

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