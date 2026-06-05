import multer from "multer";

const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const allowedDocumentMimeTypes = new Set([
  ...allowedImageMimeTypes,
  "application/pdf",
]);

const imageOnlyFields = new Set([
  "profileImage",
  "vehicleImage",
  "vehicleImages",
  "image",
  "images",
]);

const documentFields = new Set([
  "aadhaar",
  "aadhaarFront",
  "aadhaarBack",
  "pan",
  "panFront",
  "drivingLicense",
  "license",
  "licenseFront",
  "licenseBack",
  "rc",
  "rcBook",
  "rcFront",
  "rcBack",
  "insurance",
]);

const profileFileFilter = (req, file, cb) => {
  const allowedMimeTypes =
    imageOnlyFields.has(file.fieldname) && !documentFields.has(file.fieldname)
      ? allowedImageMimeTypes
      : allowedDocumentMimeTypes;

  if (allowedMimeTypes.has(file.mimetype)) {
    return cb(null, true);
  }

  const error = new Error(
    imageOnlyFields.has(file.fieldname)
      ? "Only image files are allowed"
      : "Only image and PDF files are allowed"
  );
  error.status = 400;
  return cb(error);
};

// Files stay in memory and are streamed directly to S3 by the controller/helper.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  fileFilter: profileFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
});

export const uploadSingleImage = upload.single("image");
export const uploadMultipleImages = upload.array("images", 10);
