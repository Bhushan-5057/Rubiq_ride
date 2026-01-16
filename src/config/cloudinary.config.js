import { v2 as cloudinary } from "cloudinary";
import config from "../helpers/systemConfig.helper.js";

let initialized = false;

export const initCloudinary = () => {
  if (initialized) return cloudinary;

  cloudinary.config({
    cloud_name: config.get("CLOUDINARY_CLOUD_NAME"),
    api_key: config.get("CLOUDINARY_API_KEY"),
    api_secret: config.get("CLOUDINARY_API_SECRET"),
  });

  initialized = true;
  return cloudinary;
};

export default cloudinary;
