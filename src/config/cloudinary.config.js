import { v2 as cloudinary } from "cloudinary";

let initialized = false;

export const initCloudinary = () => {
  if (initialized) return cloudinary;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  initialized = true;
  return cloudinary;
};

export default cloudinary;
