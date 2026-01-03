import { Admin } from "../../../models/admin/admin.model.js";
import mongoose from "mongoose";
import { adminToken } from "../../../helpers/helper.js";

//---------------------- Create Admin ----------------------

export async function createAdmin(payload) {
  const { email, password, name, contactNumber, gender, role = 'admin' } = payload
  const existingAdmin = await Admin.findOne({ email, isDeleted: false });

  if (existingAdmin) {
    const error = new Error("Email already registered");
    error.status = 409;
    throw error;
  }

  const admin = await Admin.create({
    email,
    password,
    name,
    contactNumber,
    gender,
    role
  });

  return {admin};
}

//----------------------------- Get All Admin -----------------------------  

export async function getAllAdminsService({
  page = 1,
  limit = 10,
  search = "",
   excludeAdminId
}) {
  const skip = (page - 1) * limit;

  const query = {
    isDeleted: false,
  }; 

    if (excludeAdminId) {
    query._id = { $ne: excludeAdminId };
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { contactNumber: { $regex: search, $options: "i" } },
    ];
  }

  const [admins, total] = await Promise.all([
    Admin.find(query)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),

    Admin.countDocuments(query),
  ]);

  return {
    admins,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
}

//------------------- Get Admin By ID ------------------- 

export async function getAdminByIdService(adminId) {
  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    const error = new Error("Invalid admin ID");
    error.status = 400;
    throw error;
  }

  const admin = await Admin.findOne({
    _id: adminId,
    isDeleted: false,
  }).select("-password")

  if (!admin) {
    const error = new Error("Admin not found or deleted");
    error.status = 404;
    throw error;
  }

  return admin;
}

//--------------------------- Update Admin --------------------------- 

export async function updateAdminService(adminId, updateData) {
  const admin = await Admin.findOneAndUpdate(
    { _id: adminId, isDeleted: false },
    updateData,
    { new: true, runValidators: true }
  ).select("-password")

  if (!admin) {
    const error = new Error("Admin not found");
    error.status = 404;
    throw error;
  }

  return admin;
}

//-------------------------- Delete Admin -------------------------- 

export async function deleteAdminService(adminId) {
  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    const error = new Error("Invalid admin ID");
    error.status = 400;
    throw error;
  }

  const admin = await Admin.findOne({
    _id: adminId,
    isDeleted: false,
  })

  if (!admin) {
    const error = new Error("Admin not found");
    error.status = 404;
    throw error;
  }

  if (admin.role?.name === "super_admin") {
    const error = new Error("Super admin cannot be deleted");
    error.status = 403;
    throw error;
  }

  admin.isDeleted = true;
  await admin.save();

  return true;
} 

//----------------------------- Restore Admin ----------------------------- 

export async function restoreAdminService(adminId) {
  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    const error = new Error("Invalid admin ID");
    error.status = 400;
    throw error;
  }

  const admin = await Admin.findOne({
    _id: adminId,
    isDeleted: true,
  });

  if (!admin) {
    const error = new Error("Deleted admin not found");
    error.status = 404;
    throw error;
  }

  admin.isDeleted = false;
  await admin.save();

  return admin;
}