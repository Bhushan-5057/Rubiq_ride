import { getProfile, updateProfile } from "../../../services/adminServices/adminProfileService/adminProfile.service.js";

//--------------------------------------- Get Profile Controller ---------------------------------------
export async function profileController(req, res, next) {
  try {
    const adminId = req.admin._id;
    const adminProfile = await getProfile(adminId);
    res.json({
      success: true,
      message: "Admin profile fetched successfully",
      user: adminProfile,
    });
  }
  catch (err) {
    next(err);
  }
}

//---------------------------------------- Update Profile Controller ----------------------------------------
export async function updateProfileController(req, res, next) {
  try {
    const adminId = req.admin._id;
    const updateData = req.body;
    const updatedAdmin = await updateProfile(adminId, updateData);
    res.json({
      success: true,
      message: "Admin profile updated successfully",
      user: updatedAdmin,
    });
  }
  catch (err) {
    next(err);
  }
}