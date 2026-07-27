import { uploadFileToS3 } from "../../../utils/s3Upload.js";
import { deleteProfile, updateProfile } from "../../../services/passengerServices/passengerProfileService/passengerProfile.service.js";
import { normalizePassengerMediaUrls } from "../../../utils/mediaUrl.js";
import { readPassengerRideStats } from "../../../helpers/rideStatsCounters.helper.js";

// -------------------- Get Profile --------------------
export async function profileController(req, res, next) {
  try {
    const passenger = req.passenger;
    if (!passenger)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const result = normalizePassengerMediaUrls(passenger.toObject ? passenger.toObject() : passenger);
    delete result.password;
    delete result.otp;
    delete result.otpExpiry;
    delete result.__v;

    const stats = readPassengerRideStats(result);
    result.getPassengerStats = stats;
    result.rideStats = stats;

    res.json({
      success: true,
      message: "Passenger profile fetched successfully",
      passenger: result,
    });
  } catch (err) {
    next(err);
  }
}

// -------------------- Update Profile --------------------
export async function updateProfileController(req, res, next) {
  try {
    const passenger = req.passenger;
    if (!passenger)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const data = { ...req.body, documents: {} };

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const folder =
          file.fieldname === "profileImage"
            ? "passenger_profile_images"
            : "passenger_documents";

        const uploadedFile = await uploadFileToS3(file, folder);

        if (file.fieldname === "profileImage") {
          data.profileImage = uploadedFile.url;
        } else {
          data.documents[file.fieldname] = uploadedFile.url;
        }
      }
    }

    const result = await updateProfile(passenger, data);

    res.status(200).json({
      success: true,
      message: "Passenger profile updated successfully",
      passenger: result.passenger,
    });
  } catch (err) {
    console.error("Error in updateProfileController:", err);
    next(err);
  }
}

// -------------------- Delete Profile --------------------
export async function deleteProfileController(req, res, next) {
  try {
    const passenger = req.passenger;
    if (!passenger)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const result = await deleteProfile(passenger);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
}
