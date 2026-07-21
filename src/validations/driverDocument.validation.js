import Joi from "joi";
import { documentStatus } from "../common/utils.js";

export const DOCUMENT_REGEX = {
  aadhaar: /^[2-9]{1}[0-9]{11}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  license: /^[A-Z]{2}[0-9]{2}(19|20)[0-9]{2}[0-9]{7}$/,
  rc: /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,
};

export const DOCUMENT_STATUS_VALUES = [
  "not_uploaded",
  "pending",
  "approved",
  "rejected",
];

const statusSchema = Joi.string()
  .trim()
  .lowercase()
  .valid(...DOCUMENT_STATUS_VALUES);

const statusFieldsSchema = Object.fromEntries(
  documentStatus.map((field) => [field, statusSchema]),
);

export const verifyDriverDocumentsValidation = [
  (req, res, next) => {
    const schema = Joi.object({
      ...statusFieldsSchema,
      docStatuses: Joi.object(statusFieldsSchema).min(1),
      remarks: Joi.string().trim().max(1000).allow(""),
    })
      .or(...documentStatus, "docStatuses")
      .unknown(false);

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: false,
    });

    if (error) {
      return res.status(400).json({
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
    return next();
  },
];
