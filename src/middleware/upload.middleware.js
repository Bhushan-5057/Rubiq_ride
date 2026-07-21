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

/** Explicit allowlist for driver profile/document uploads. */
export const DRIVER_PROFILE_UPLOAD_FIELDS = [
  { name: "profileImage", maxCount: 1 },
  { name: "aadhaarFront", maxCount: 1 },
  { name: "aadhaarBack", maxCount: 1 },
  { name: "panFront", maxCount: 1 },
  { name: "licenseFront", maxCount: 1 },
  { name: "licenseBack", maxCount: 1 },
  { name: "rcFront", maxCount: 1 },
  { name: "rcBack", maxCount: 1 },
];

const driverDocumentFields = new Set(
  DRIVER_PROFILE_UPLOAD_FIELDS.map((field) => field.name).filter(
    (name) => name !== "profileImage",
  ),
);

const createFileFilter = ({ strictFieldAllowlist = null } = {}) => {
  return (req, file, cb) => {
    if (
      strictFieldAllowlist &&
      !strictFieldAllowlist.has(file.fieldname)
    ) {
      const error = new Error(`Unexpected upload field: ${file.fieldname}`);
      error.status = 400;
      return cb(error);
    }

    const allowedMimeTypes =
      imageOnlyFields.has(file.fieldname) &&
      !driverDocumentFields.has(file.fieldname)
        ? allowedImageMimeTypes
        : allowedDocumentMimeTypes;

    if (allowedMimeTypes.has(file.mimetype)) {
      return cb(null, true);
    }

    const error = new Error(
      imageOnlyFields.has(file.fieldname)
        ? "Only image files are allowed"
        : "Only image and PDF files are allowed",
    );
    error.status = 400;
    return cb(error);
  };
};

// Files stay in memory and are streamed directly to S3 by the controller/helper.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  fileFilter: createFileFilter(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
});

const driverUpload = multer({
  storage,
  fileFilter: createFileFilter({
    strictFieldAllowlist: new Set(
      DRIVER_PROFILE_UPLOAD_FIELDS.map((field) => field.name),
    ),
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
});

export const uploadDriverProfileFields = driverUpload.fields(
  DRIVER_PROFILE_UPLOAD_FIELDS,
);

export const uploadSingleImage = upload.single("image");
export const uploadMultipleImages = upload.array("images", 10);
