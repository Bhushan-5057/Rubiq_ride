import { uploadFileToS3 } from "../utils/s3Upload.js";

export const uploadImageController = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    const folder = req.body.folder || "uploads/images";
    const uploadedFile = await uploadFileToS3(req.file, folder);

    return res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      file: uploadedFile,
    });
  } catch (error) {
    return next(error);
  }
};
