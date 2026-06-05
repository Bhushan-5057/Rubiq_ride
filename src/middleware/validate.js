
import { validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }

  next();
};

