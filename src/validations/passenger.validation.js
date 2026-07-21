import Joi from "joi";
import { USER_STATUS } from "../constants/userStatus.constants.js";

const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const textRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const indianMobileRegex = /^(\+91)?[6-9]\d{9}$/;
const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
const otpRegex = /^\d{4,6}$/;
const dateOfBirthRegex = /^\d{4}-\d{2}-\d{2}$/;

const messages = {
  "object.unknown": "{{#label}} is not allowed",
  "string.empty": "{{#label}} is required",
  "any.required": "{{#label}} is required",
};

function formatErrors(error, location) {
  return error.details.map((detail) => ({
    msg: detail.message.replace(/"/g, ""),
    path: detail.path.join("."),
    location,
  }));
}

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

function validateBody(schema, statusCode = 422, options = {}) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: false,
      ...options,
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
      console.warn("[passenger.validation] body validation failed", {
        path: req.originalUrl || req.url,
        method: req.method,
        bodyKeys: Object.keys(req.body || {}),
        errors: formatErrors(error, "body"),
      });
      return res.status(statusCode).json({
        success: false,
        message: "Validation failed",
        errors: formatErrors(error, "body"),
      });
    }

    req.body = value;
    next();
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: false,
    });

    if (error) {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: formatErrors(error, "params"),
      });
    }

    req.params = value;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: false,
    });

    if (error) {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: formatErrors(error, "query"),
      });
    }

    req.query = value;
    next();
  };
}

function validateDateOfBirth(value, helpers) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  const isValidDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isValidDate) {
    return helpers.message("dateOfBirth must be a valid date");
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  if (date > todayUtc) {
    return helpers.message("dateOfBirth cannot be a future date");
  }

  return value;
}

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

export const updatePassengerValidation = [
  validateBody(
    Joi.object({
      name: Joi.string().trim().min(2).max(60).pattern(nameRegex).messages({
        "string.min": "Name must be at least 2 characters",
        "string.max": "Name must be at most 60 characters",
        "string.pattern.base": "Name can contain only letters and spaces",
      }),
      email: Joi.string().trim().lowercase().email().messages({
        "string.email": "Invalid email format",
      }),
      gender: Joi.string().trim().lowercase().valid("male", "female", "other").messages({
        "any.only": "Invalid gender value",
      }),
      dateOfBirth: Joi.string().trim().pattern(dateOfBirthRegex).custom(validateDateOfBirth).messages({
        "string.pattern.base": "dateOfBirth must be in YYYY-MM-DD format",
      }),
      city: Joi.string().trim().min(2).max(60).pattern(textRegex).messages({
        "string.min": "City must be valid",
        "string.max": "City must be at most 60 characters",
        "string.pattern.base": "City can contain only letters and spaces",
      }),
      contactNumber: Joi.string().trim().pattern(indianMobileRegex).messages({
        "string.pattern.base": "Invalid phone number",
      }),
      profileImage: Joi.string().trim().min(1).messages({
        "string.min": "profileImage cannot be empty",
      }),
      // Client often echoes this; server recomputes it — strip instead of rejecting.
      profileCompleted: Joi.any().strip(),
      forceEmail: Joi.boolean().optional(),
    })
      .min(1)
      .unknown(false)
      .messages({
        ...messages,
        "object.min": "At least one profile field is required",
      }),
    422,
    { stripUnknown: true },
  ),
];

export const passengerIdParamValidation = [
  validateParams(
    Joi.object({
      id: Joi.string().trim().pattern(mongoIdRegex).required().messages({
        "string.pattern.base": "Invalid passenger ID format",
      }),
    })
      .unknown(false)
      .messages(messages)
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

export const getPassengerQueryValidation = [
  validateQuery(
    Joi.object({
      city: Joi.string().trim().min(2).max(60).pattern(textRegex).messages({
        "string.pattern.base": "City can contain only letters and spaces",
      }),
      status: Joi.string()
        .trim()
        .lowercase()
        .valid(...Object.values(USER_STATUS))
        .messages({
          "any.only": "Invalid status filter",
        }),
    })
      .unknown(false)
      .messages(messages)
  ),
];
