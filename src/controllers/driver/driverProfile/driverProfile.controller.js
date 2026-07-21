import { uploadFileToS3 } from "../../../utils/s3Upload.js";
import { getDriverProfileStatus } from "../../../services/adminServices/driverManagementService/driverManagement.service.js";
import { deleteProfile, updateProfile, getProfile } from "../../../services/driverServices/driverProfileService/driverProfile.service.js";
import { setDriverOfflineService, setDriverOnlineService } from ".././../../services/driverServices/driverProfileService/driverProfile.service.js";


//------------------------ Driver Go Online ------------------------
export const setDriverOnlineController = async (req, res, next) => {
  try {
    const driverId = req.driver._id;
    const driver = await setDriverOnlineService(driverId);
    res.status(200).json({
      success: true,
      message: "Driver is now online",
      driver,
    });
  } catch (error) {
    next(error);
  }
} 

//------------------------ Driver Go Offline ------------------------
export const setDriverOfflineController = async (req, res, next) => {
  try {
    const driverId = req.driver._id;
    const driver = await setDriverOfflineService(driverId);
    res.status(200).json({
      success: true,
      message: "Driver is now offline",
      driver,
    });
  } catch (error) {
    next(error);
  }
}

// -------------------- Driver Profile --------------------
export async function profileController(req, res, next) {
  try {
    if (!req.driver) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const driver = await getProfile(req.driver);

    res.json({
      success: true,
      message: "Driver profile fetched successfully",
      driver,
    });
  } catch (err) {
    next(err);
  }
}

function flattenUploadedFiles(files) {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  return Object.values(files).flat().filter(Boolean);
}

// -------------------- Update Driver Profile --------------------
export async function updateProfileController(req, res, next) {
  try {
    const data = { ...req.body, documents: {} };
    const uploadedFiles = flattenUploadedFiles(req.files);

    for (const file of uploadedFiles) {
      const folder =
        file.fieldname === "profileImage"
          ? "driver_profile_images"
          : "driver_documents";

      const uploadedFile = await uploadFileToS3(file, folder);

      if (file.fieldname === "profileImage") {
        data.profileImage = uploadedFile.key;
      } else {
        data.documents[file.fieldname] = uploadedFile.key;
      }
    }

    const driver = await updateProfile(req.driver, data);

    res.status(200).json({
      success: true,
      message: "Driver profile updated successfully",
      driver,
    });
  } catch (err) {
    next(err);
  }
}

// -------------------- Delete Driver Profile --------------------
export async function deleteProfileController(req, res, next) {
  try {
    if (!req.driver) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await deleteProfile(req.driver);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
}

// -------------------- Driver Profile Status --------------------
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
