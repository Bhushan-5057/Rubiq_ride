import crypto from "crypto";
import path from "path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../config/s3.config.js";

const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const mimeTypeToExtension = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export class S3UploadError extends Error {
  constructor(message, status = 500, cause) {
    super(message);
    this.name = "S3UploadError";
    this.status = status;
    this.cause = cause;
  }
}

const sanitizePathPart = (value = "uploads") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^-+|-+$/g, "") || "uploads";

const getFileExtension = (file) => {
  const extensionFromMimeType = mimeTypeToExtension[file.mimetype];
  if (extensionFromMimeType) return extensionFromMimeType;

  const originalExtension = path.extname(file.originalname || "").toLowerCase();
  return originalExtension || "";
};

export const generateS3Key = (file, folder = "uploads") => {
  const safeFolder = sanitizePathPart(folder);
  const datePath = new Date().toISOString().slice(0, 10);
  const uniqueId = crypto.randomUUID();
  const extension = getFileExtension(file);

  return `${safeFolder}/${datePath}/${uniqueId}${extension}`;
};

export const getPublicS3Url = (key) => {
  const bucketName = process.env.AWS_BUCKET_NAME;
  const awsRegion = process.env.AWS_REGION;
  const encodedKey = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `https://${bucketName}.s3.${awsRegion}.amazonaws.com/${encodedKey}`;
};

export const uploadFileToS3 = async (file, folder = "uploads") => {
  const bucketName = process.env.AWS_BUCKET_NAME;
  const awsRegion = process.env.AWS_REGION;

  if (!bucketName) {
    throw new S3UploadError("AWS_BUCKET_NAME is required");
  }

  if (!awsRegion) {
    throw new S3UploadError("AWS_REGION is required");
  }

  if (!file?.buffer) {
    throw new S3UploadError("File buffer is required", 400);
  }

  if (!allowedImageMimeTypes.has(file.mimetype)) {
    throw new S3UploadError("Only image files are allowed", 400);
  }

  const key = generateS3Key(file, folder);

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    return {
      key,
      url: getPublicS3Url(key),
      bucket: bucketName,
      contentType: file.mimetype,
      size: file.size,
    };
  } catch (error) {
    throw new S3UploadError("Failed to upload file to S3", 500, error);
  }
};

export default uploadFileToS3;
