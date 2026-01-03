import { getProfile } from "../../../services/adminServices/adminProfileService/adminProfile.service.js";

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

//--------------------------------- Update Super Admin Profile --------------------------------- 

export async function updateMyProfileController(req, res, next) {
  try {
    const admin = req.admin;

    Object.assign(admin, req.body);
    await admin.save();

    const adminData = admin.toObject();
    delete adminData.password;

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: adminData,
    });
  } catch (err) {
    next(err);
  }
}