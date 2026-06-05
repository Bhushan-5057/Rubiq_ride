import Joi from "joi";
import { DOCUMENT_REGEX } from "./driverDocument.validation.js";

const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const textRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const indianMobileRegex = /^(\+91)?[6-9]\d{9}$/;
const otpRegex = /^\d{4,6}$/;
const vehicleNumberRegex = /^[A-Z]{2}(0[1-9]|[1-9][0-9])[A-Z]{1,2}[0-9]{4}$/;

const messages = {
  "object.unknown": "{{#label}} is not allowed",
  "string.empty": "{{#label}} is required",
  "any.required": "{{#label}} is required",
};

function hasUploadedFiles(files) {
  if (Array.isArray(files)) return files.length > 0;
  if (files && typeof files === "object") {
    return Object.values(files).some((file) =>
      Array.isArray(file) ? file.length > 0 : Boolean(file)
    );
  }
  return false;
}

function isEmptyObject(value) {
  return !value || (typeof value === "object" && Object.keys(value).length === 0);
}

function hasOnlyObjectMinError(error) {
  return error.details.length === 1 && error.details[0].type === "object.min";
}

function validateBody(schema, statusCode = 400) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: false,
    });

    if (
      error &&
      hasUploadedFiles(req.files) &&
      isEmptyObject(req.body) &&
      hasOnlyObjectMinError(error)
    ) {
      req.body = value;
      return next();
    }

    if (error) {
      return res.status(statusCode).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((detail) => ({
          msg: detail.message.replace(/"/g, ""),
          path: detail.path.join("."),
          location: "body",
        })),
      });
    }

    req.body = value;
    next();
  };
}

function validateDriverAge(value, helpers) {
  const dob = new Date(value);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();

  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

  const actualAge = hasHadBirthdayThisYear ? age : age - 1;

  if (actualAge < 18) {
    return helpers.message("Driver must be at least 18 years old");
  }

  return value;
}

export const updateProfileValidation = [
  validateBody(
    Joi.object({
      name: Joi.string().trim().min(2).max(60).pattern(nameRegex).messages({
        "string.min": "Name must be at least 2 characters",
        "string.max": "Name must be at most 60 characters",
        "string.pattern.base": "Name can contain only letters and spaces",
      }),
      location: Joi.object({
        type: Joi.string().valid("Point").required(),

        coordinates: Joi.array()
          .items(
            Joi.number().required(),
            Joi.number().required()
          )
          .length(2)
          .required(),
      }),
      email: Joi.string().trim().lowercase().email().messages({
        "string.email": "Invalid email format",
      }),
      vehicleNumber: Joi.string()
        .trim()
        .uppercase()
        .pattern(vehicleNumberRegex)
        .messages({
          "string.pattern.base": "Invalid vehicle number. Example: GJ05AB1234",
        }),
      dateOfBirth: Joi.string().trim().isoDate().custom(validateDriverAge),
      gender: Joi.string().trim().lowercase().valid("male", "female", "other"),
      vehicleType: Joi.string().trim().lowercase().valid("cab", "bike", "auto"),
      city: Joi.string().trim().min(2).max(60).pattern(textRegex).messages({
        "string.min": "City must be valid",
        "string.max": "City must be at most 60 characters",
        "string.pattern.base": "City can contain only letters and spaces",
      }),
      aadhaarNumber: Joi.string().trim().pattern(DOCUMENT_REGEX.aadhaar).messages({
        "string.pattern.base":
          "Invalid Aadhaar number. Example: 803177467945 (12 digits, should not start with 0 or 1)",
      }),
      panNumber: Joi.string().trim().uppercase().pattern(DOCUMENT_REGEX.pan).messages({
        "string.pattern.base":
          "Invalid PAN number. Example: CXEPP7072E (5 letters + 4 digits + 1 letter)",
      }),
      licenseNumber: Joi.string()
        .trim()
        .uppercase()
        .pattern(DOCUMENT_REGEX.license)
        .messages({
          "string.pattern.base":
            "Invalid Driving License number. Example: TS0920230001234",
        }),
      rcNumber: Joi.string().trim().uppercase().pattern(DOCUMENT_REGEX.rc).messages({
        "string.pattern.base": "Invalid RC number. Example: TS09AB1234",
      }),
      insuranceNumber: Joi.string()
        .trim()
        .uppercase()
        .pattern(DOCUMENT_REGEX.insurance)
        .messages({
          "string.pattern.base":
            "Invalid Insurance number. Example: INS-123456 or ABC12345",
        }),
    })
      .min(1)
      .unknown(false)
      .messages({
        ...messages,
        "object.min": "At least one profile field is required",
      })
  ),
];

export const otpSendValidation = [
  validateBody(
    Joi.object({
      contactNumber: Joi.string().trim().pattern(indianMobileRegex).required().messages({
        "string.pattern.base": "Invalid contact number",
      }),
    })
      .unknown(false)
      .messages(messages)
  ),
];

export const otpLoginValidation = [
  validateBody(
    Joi.object({
      contactNumber: Joi.string().trim().pattern(indianMobileRegex).required().messages({
        "string.pattern.base": "Invalid phone number",
      }),
      otp: Joi.string().trim().pattern(otpRegex).required().messages({
        "string.pattern.base": "OTP must be between 4 to 6 digits",
      }),
    })
      .unknown(false)
      .messages(messages)
  ),
];
