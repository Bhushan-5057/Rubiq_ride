import { Admin } from "../../../../models/admin/Admin.model.js";
import { register } from "../../../../services/adminServices/adminAuthService/adminAuth.service.js";
import dotenv from "dotenv"
import bcrypt from "bcryptjs"

dotenv.config();
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
export async function getAllAdminsController(req, res, next) {
  try {
    const admins = await Admin.find({ isDeleted: false }).select("-password");

    res.status(200).json({
      success: true,
      message: "All admins fetched successfully",
      data: admins,
    });
  } catch (err) {
    next(err);
  }
}

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

//updated admin

export async function updateAdminController(req, res, next) {
  try {
    const { adminId } = req.params;
    const { name, email, password, role } = req.body;

    const adminToUpdate = await Admin.findById(adminId);

    if (!adminToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // 🚫 BLOCK SEEDED ADMIN UPDATE
    if (adminToUpdate.email === process.env.ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: "This admin account is protected and cannot be updated.",
      });
    }

    const updateData = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      data: updatedAdmin,
    });

  } catch (err) {
    next(err);
  }
}
//delete admin
export async function deleteAdminController(req, res, next) {
  try {
    const { adminId } = req.params;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
    await Admin.findByIdAndDelete(adminId);

    res.status(200).json({
      success: true,
      message: "Admin deleted permanently",
    });
  } catch (err) {
    next(err);
  }
}
