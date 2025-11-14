import { uploadToCloudinary } from "../../../helpers/cloudinary.helper.js";
import { updateProfile } from "../../../services/passenger/index.js";

// -------------------- Get Profile --------------------
export async function profileController(req, res, next) {
  try {
    const passenger = req.passenger;
    if (!passenger)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const result = passenger.toObject ? passenger.toObject() : passenger;
    delete result.password;
    delete result.otp;
    delete result.otpExpiry;
    delete result.__v;

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

        const url = await uploadToCloudinary(file.buffer, folder);

        if (file.fieldname === "profileImage") {
          data.profileImage = url;
        } else {
          data.documents[file.fieldname] = url;
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