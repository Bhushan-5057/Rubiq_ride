import Joi from "joi";
import { ADMIN_ROLES, USER_STATUS } from "../constants/userStatus.constants.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{10,15}$/;

const messages = {
  "string.empty": "{{#label}} is required",
  "any.required": "{{#label}} is required",
  "object.unknown": "{{#label}} is not allowed",
};

const emailSchema = Joi.string()
  .trim()
  .lowercase()
  .pattern(emailRegex)
  .required()
  .messages({
    "string.pattern.base": "Valid email is required",
  });

const nameSchema = Joi.string()
  .trim()
  .min(2)
  .max(60)
  .pattern(nameRegex)
  .messages({
    "string.min": "Name must be at least 2 characters",
    "string.max": "Name must be at most 60 characters",
    "string.pattern.base": "Name can contain only letters and spaces",
  });

const passwordSchema = Joi.string()
  .min(10)
  .max(15)
  .pattern(passwordRegex)
  .messages({
    "string.min": "Password must be at least 10 characters",
    "string.max": "Password must be at most 15 characters",
    "string.pattern.base":
      "Password must contain one uppercase letter, one lowercase letter, one special character and be 10 to 15 characters long",
  });

function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: false,
    });

    if (error) {
      return res.status(422).json({
        status: false,
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

export const validateCreate = [
  validateBody(
    Joi.object({
      email: emailSchema,
      password: passwordSchema.required(),
      name: nameSchema.required(),
      role: Joi.string()
        .trim()
        .lowercase()
        .valid(ADMIN_ROLES.ADMIN)
        .default(ADMIN_ROLES.ADMIN)
        .messages({ "any.only": "Only admin role can be created here" }),
    })
      .unknown(false)
      .messages(messages)
  ),
];

export const validateSuperAdminRegister = [
  validateBody(
    Joi.object({
      email: emailSchema,
      password: passwordSchema.required(),
      name: nameSchema.required(),
      role: Joi.string()
        .trim()
        .lowercase()
        .valid(ADMIN_ROLES.SUPER_ADMIN)
        .required()
        .messages({ "any.only": "role must be super_admin" }),
    })
      .unknown(false)
      .messages(messages)
  ),
];

export const validateStatusUpdate = [
  validateBody(
    Joi.object({
      isActive: Joi.boolean().strict().required().messages({
        "boolean.base": "isActive must be a boolean",
      }),
    })
      .unknown(false)
      .messages(messages)
  ),
];

export const validateLifecycleStatusUpdate = [
  validateBody(
    Joi.object({
      status: Joi.string()
        .trim()
        .lowercase()
        .valid(...Object.values(USER_STATUS))
        .required()
        .messages({ "any.only": "Invalid status" }),
      blockedReason: Joi.string().trim().max(500).optional(),
    })
      .unknown(false)
      .messages(messages)
  ),
];

export const validateLogin = [
  validateBody(
    Joi.object({
      email: emailSchema,
      password: Joi.string().required().messages({
        "string.base": "Password is required",
      }),
    })
      .unknown(false)
      .messages(messages)
  ),
];

export const validateAdminProfileUpdate = [
  validateBody(
    Joi.object({
      name: nameSchema.optional(),
      oldPassword: passwordSchema.optional(),
      newPassword: passwordSchema.optional(),
      confirmPassword: passwordSchema.optional(),
    })
      .or("name", "oldPassword", "newPassword", "confirmPassword")
      .and("oldPassword", "newPassword", "confirmPassword")
      .unknown(false)
      .messages({
        ...messages,
        "object.missing": "At least one profile field is required",
        "object.and":
          "Old password, new password and confirm password are required together",
      })
  ),
];
