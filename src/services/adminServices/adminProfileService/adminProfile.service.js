import { Admin } from "../../../models/admin/admin.model.js";
import { adminRepository } from "../../../repositories/admin.repository.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

function assertObjectId(id, label = "ID") {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(`Invalid ${label}`, 400);
  }
}

function pickAdminFields(payload, allowedFields) {
  return allowedFields.reduce((result, field) => {
    if (payload[field] !== undefined) result[field] = payload[field];
    return result;
  }, {});
}

function createHttpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

//----------------------- Get Profile -----------------------
export async function getProfile(userId) {
  const user = await Admin.findOne({ _id: userId, isActive: true }).select("-password");
  if (!user) {
    throw createHttpError("User not found", 404);
  }
  return user;
}

//--------------------------- Update Own Profile ---------------------------
export async function updateOwnAdminProfileService(adminId, updateData) {
  assertObjectId(adminId, "admin ID");

  const safeUpdateData = pickAdminFields(updateData, ["name"]);

  const {
    oldPassword,
    newPassword,
    confirmPassword,
  } = updateData;

  console.log("Received update data:", updateData);

  const admin = await adminRepository.findById(adminId, {
    withPassword: true,
  });

  if (!admin || admin.isActive === false) {
    throw createHttpError("Active admin not found", 404);
  }

  // ---------------- Password Update Logic ----------------
  if (oldPassword || newPassword || confirmPassword) {
    if (!oldPassword || !newPassword || !confirmPassword) {
      throw createHttpError(
        "Old password, new password and confirm password are required",
        400
      );
    }

    const isOldPasswordCorrect = await admin.comparePassword(oldPassword);

    if (!isOldPasswordCorrect) {
      throw createHttpError("Old password is incorrect", 400);
    }

    if (oldPassword === newPassword) {
      throw createHttpError(
        "New password cannot be same as old password",
        400
      );
    }

    if (newPassword !== confirmPassword) {
      throw createHttpError(
        "New password and confirm password do not match",
        400
      );
    }

    const salt = await bcrypt.genSalt(10);
    safeUpdateData.password = await bcrypt.hash(newPassword, salt);
  }

  const updatedAdmin = await adminRepository.updateById(
    adminId,
    safeUpdateData
  );

  return updatedAdmin;
}
