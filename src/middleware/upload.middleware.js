import multer from "multer";

const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const imageFileFilter = (req, file, cb) => {
  if (allowedImageMimeTypes.has(file.mimetype)) {
    return cb(null, true);
  }

  const error = new Error("Only image files are allowed");
  error.status = 400;
  return cb(error);
};

// Files stay in memory and are streamed directly to S3 by the controller/helper.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
});

export const uploadSingleImage = upload.single("image");
export const uploadMultipleImages = upload.array("images", 10);
