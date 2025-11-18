import { register } from "../../../services/admin/auth/auth.service.js";

export async function registerController(req, res, next) {
  try {
    const { newAdmin, token } = await register(req.body);

    const adminData = newAdmin._doc ? { ...newAdmin._doc } : { ...newAdmin };
    delete adminData.password;

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        admin: adminData,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}



//get all admin 
export async function getAdminProfileController(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      message: "Admin fetched successfully",
      data: req.admin, 
    });
  } catch (err) {
    next(err);
  }
}