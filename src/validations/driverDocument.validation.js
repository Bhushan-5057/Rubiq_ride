import { body } from "express-validator";

export const DOCUMENT_REGEX = {
  aadhaar: /^[2-9]{1}[0-9]{11}$/,               // 12 digits, starts 2–9
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,            // ABCDE1234F
  license: /^[A-Z]{2}[0-9]{2}[0-9A-Z]{11,13}$/, // TS09XXXXXXXXXXX
  rc: /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,     // TS09AB1234
  insurance: /^[A-Z0-9\-\/]{6,20}$/,            // INS-123456 / ABC12345
};

export const driverDocumentValidation = [
  body("aadhaarNumber")
    .optional()
    .matches(DOCUMENT_REGEX.aadhaar)
    .withMessage(
      "Invalid Aadhaar number. Example: 803177457945 (12 digits, should not start with 0 or 1)"
    ),

  body("panNumber")
    .optional()
    .matches(DOCUMENT_REGEX.pan)
    .withMessage(
      "Invalid PAN number. Example: CXEPP7071D (5 letters + 4 digits + 1 letter)"
    ),

  body("licenseNumber")
    .optional()
    .matches(DOCUMENT_REGEX.license)
    .withMessage(
      "Invalid Driving License number. Example: TS0920230001234"
    ),

  body("rcNumber")
    .optional()
    .matches(DOCUMENT_REGEX.rc)
    .withMessage(
      "Invalid RC number. Example: TS09AB1234"
    ),

  body("insuranceNumber")
    .optional()
    .matches(DOCUMENT_REGEX.insurance)
    .withMessage(
      "Invalid Insurance number. Example: INS-123456 or ABC12345"
    ),
];