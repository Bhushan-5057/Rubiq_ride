import { uploadToCloudinary } from "../../../helpers/cloudinary.helper.js";
import { upload } from "../../../middleware/upload.middleware.js";
import { getDriverProfileStatus } from "../../../services/driverServices/driverManagementService/driverManagement.service.js";
import { updateProfile } from "../../../services/driverServices/driverProfileService/driverProfile.service.js";

// -------------------- PROFILE --------------------
export async function profileController(req, res, next) {
  try {
    if (!req.driver) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    res.json({
      success: true,
      message: "Captain profile fetched successfully",
      driver: req.driver, 
    });
  } catch (err) {
    next(err);
  }
}

// -------------------- UPDATE PROFILE --------------------

export async function updateProfileController(req, res, next) {
  try {
    // Handle multer file parsing
    await new Promise((resolve, reject) => {
      upload.any()(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const data = { ...req.body, documents: {} };

    // Upload files to Cloudinary
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const folder =
          file.fieldname === "profileImage"
            ? "driver_profile_images"
            : "driver_documents";

        const url = await uploadToCloudinary(file.buffer, folder);

        if (file.fieldname === "profileImage") {
          data.profileImage = url;
        } else {
          data.documents[file.fieldname] = url;
        }
      }
    }

    const driver = await updateProfile(req.driver, data);

    res.status(200).json({
      success: true,
      message: "Captain profile updated successfully",
      driver,
    });
  } catch (err) {
    next(err);
  }
}



// -------------------- CHECK DRIVER PROFILE STATUS --------------------
export const checkDriverProfileStatusController = async (req, res) => {
  try {
    const { contactNumber } = req.params;
    const status = await getDriverProfileStatus(contactNumber);

    res.status(200).json({
      success: true,
      ...status,
    });
  } catch (err) {
    console.error("Error checking driver profile status:", err);
    if (err.message === "Driver not found") {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
