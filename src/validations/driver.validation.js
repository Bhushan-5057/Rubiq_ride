import { body } from "express-validator";

export const updateProfileValidation = [
  body("name").optional().isString().trim(),
  body("email").optional().isEmail().normalizeEmail(),
  body("vehicleNumber").optional().isString().trim().toUpperCase(),
  body("licenseNumber").optional().isString().trim().toUpperCase(),
  body("dateOfBirth").optional().isISO8601().toDate(),
  body("gender").optional().isIn(["male", "female", "other"]),
  body("vehicleType").optional().isIn(["cab", "bike", "auto"]),
  body("city").optional().isString().trim(),
];
