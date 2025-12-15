// import { validationResult } from "express-validator";

// //------------------------ Global Validation ------------------------
// export function validate(validations) {
//   return async (req, res, next) => {
//     // Run all validations
//     await Promise.all(validations.map(validation => validation.run(req)));

//     const errors = validationResult(req);
//     if (errors.isEmpty()) {
//       return next();
//     }

//     return res.status(400).json({
//       success: false,
//       message: "Validation failed",
//       errors: errors.array(),
//     });
//   };
// }

import { validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      errors: errors.array()
    });
  }

  next();
};

