export const DOCUMENT_REGEX = {
  aadhaar: /^[2-9]{1}[0-9]{11}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  license: /^[A-Z]{2}[0-9]{2}(19|20)[0-9]{2}[0-9]{7}$/,
  rc: /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,
  insurance: /^[A-Z0-9/-]{6,20}$/,
};

export const driverDocumentValidation = [];
