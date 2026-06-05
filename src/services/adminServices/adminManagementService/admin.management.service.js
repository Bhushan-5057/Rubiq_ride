import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { adminRepository } from "../../../repositories/admin.repository.js";
import { ADMIN_ROLES, getStatusUpdateMessage } from "../../../constants/userStatus.constants.js";

function createHttpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function assertObjectId(id, label = "ID") {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(`Invalid ${label}`, 400);
  }
}

function assertSuperAdmin(actor) {
  if (actor?.role !== ADMIN_ROLES.SUPER_ADMIN) {
    throw createHttpError("Only super admin can perform this action", 403);
  }
}

async function validateAdminRole(role) {
  if (!Object.values(ADMIN_ROLES).includes(role)) {
    throw createHttpError("Invalid admin role", 400);
  }

  if (role === ADMIN_ROLES.SUPER_ADMIN && await adminRepository.existsSuperAdmin()) {
    throw createHttpError("Only one super admin can exist", 409);
  }
}

function pickAdminFields(payload, allowedFields) {
  return allowedFields.reduce((result, field) => {
    if (payload[field] !== undefined) result[field] = payload[field];
    return result;
  }, {});
}

function normalizeAdminRole(role) {
  if (role === "ADMIN") return ADMIN_ROLES.ADMIN;
  if (role === "SUPER_ADMIN") return ADMIN_ROLES.SUPER_ADMIN;
  return role;
}

//---------------------- Register Admin ----------------------
export async function registerAdmin(payload, actor) {
  assertSuperAdmin(actor);

  const {
    email,
    password,
    name,
    role = ADMIN_ROLES.ADMIN,
  } = payload;

  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedRole = normalizeAdminRole(role);
  await validateAdminRole(normalizedRole);

  if (normalizedRole !== ADMIN_ROLES.ADMIN) {
    throw createHttpError("SUPER_ADMIN can only create ADMIN users", 403);
  }

  const existingAdmin = await adminRepository.findByEmail(normalizedEmail);
  if (existingAdmin) {
    throw createHttpError("Email already registered", 409);
  }

  const admin = await adminRepository.create({
    email: normalizedEmail,
    password,
    name,
    role: normalizedRole,
    isActive: true,
  });

  return { admin };
}

export const createAdmin = registerAdmin;

//---------------------- Register Super Admin ----------------------
export async function registerSuperAdmin(payload) {
  const { email, password, name, role } = payload;
  const normalizedRole = normalizeAdminRole(role);

  if (normalizedRole !== ADMIN_ROLES.SUPER_ADMIN) {
    throw createHttpError("Only SUPER_ADMIN role is allowed", 400);
  }

  if (await adminRepository.existsSuperAdmin()) {
    throw createHttpError("SUPER_ADMIN already exists", 409);
  }

  const normalizedEmail = email?.trim().toLowerCase();
  const existingAdmin = await adminRepository.findByEmail(normalizedEmail);
  if (existingAdmin) {
    throw createHttpError("Email already registered", 409);
  }

  const admin = await adminRepository.create({
    email: normalizedEmail,
    password,
    name,
    role: ADMIN_ROLES.SUPER_ADMIN,
    isActive: true,
  });

  return { admin };
}

//----------------------------- Get All Admin -----------------------------
export async function getAllAdminsService({
  page = 1,
  limit = 10,
  search = "",
  excludeAdminId,
  isActive,
}) {
  const numericPage = Math.max(1, Number(page) || 1);
  const numericLimit = Math.max(1, Number(limit) || 10);
  const skip = (numericPage - 1) * numericLimit;

  const query = {};

  if (isActive !== undefined) {
    query.isActive = isActive === true || isActive === "true";
  }

  if (excludeAdminId) {
    query._id = { $ne: excludeAdminId };
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [admins, total] = await Promise.all([
    adminRepository.findAll(query, {
      skip,
      limit: numericLimit,
      sort: { createdAt: -1 },
    }),
    adminRepository.count(query),
  ]);

  return {
    admins,
    pagination: {
      total,
      page: numericPage,
      limit: numericLimit,
      totalPages: Math.ceil(total / numericLimit),
    },
  };
}

//------------------- Get Admin By ID -------------------
export async function getAdminByIdService(adminId) {
  assertObjectId(adminId, "admin ID");

  const admin = await adminRepository.findById(adminId);
  if (!admin) {
    throw createHttpError("Admin not found", 404);
  }

  return admin;
}

//-------------------------- Update Admin Status --------------------------
export async function updateAdminStatusService(adminId, isActive, actor) {
  assertSuperAdmin(actor);
  assertObjectId(adminId, "admin ID");

  if (typeof isActive !== "boolean") {
    throw createHttpError("isActive must be a boolean", 400);
  }

  const admin = await adminRepository.findById(adminId);
  if (!admin) {
    throw createHttpError("Admin not found", 404);
  }

  if (admin.role === ADMIN_ROLES.SUPER_ADMIN && isActive === false) {
    throw createHttpError("Super admin cannot be deactivated", 403);
  }

  admin.isActive = isActive;
  await admin.save();

  return {
    message: getStatusUpdateMessage("User", isActive),
    admin,
  };
}
