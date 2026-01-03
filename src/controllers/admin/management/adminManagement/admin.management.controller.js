import {
  createAdmin,
  deleteAdminService,
  getAdminByIdService,
  getAllAdminsService,
  restoreAdminService,
  updateAdminService
}
  from "../../../../services/adminServices/adminManagementService/admin.management.service.js";
import bcrypt from "bcryptjs"


//----------------------------- Admin Create Controller -----------------------------
export async function createAdminController(req, res, next) {
  try {
    const { admin } = await createAdmin(req.body);

    const adminData = admin.toObject()
    delete adminData.password;

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: { admin: adminData, },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------- Get All Admin ----------------------------------------
export async function getAllAdminsController(req, res, next) {
  try {
    const { page, limit, search } = req.query;

    const result = await getAllAdminsService({
      page,
      limit,
      search,
      excludeAdminId: req.admin._id,
    });

    res.status(200).json({
      success: true,
      message: "Admins fetched successfully",
      pagination: result.pagination,
      data: result.admins,
    });
  } catch (error) {
    next(error);
  }
}

//------------------------ Get Admin By ID ------------------------

export async function getAdminByIdController(req, res, next) {
  try {
    const { adminId } = req.params;

    const admin = await getAdminByIdService(adminId);

    res.status(200).json({
      success: true,
      message: "Admin fetched successfully",
      data: admin,
    });
  } catch (error) {
    next(error);
  }
}

//----------------------------- Updated Admin -----------------------------

export async function updateAdminController(req, res, next) {
  try {
    const { adminId } = req.params;
    const { name, email, password} = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const admin = await updateAdminService(adminId, updateData);

    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      data: admin,
    });
  } catch (error) {
    next(error);
  }
}
// --------------------------- Delete Admin -----------------------
export async function deleteAdminController(req, res, next) {
  try {
    const { adminId } = req.params;

    await deleteAdminService(adminId);

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    next(error);
  }
} 

//--------------------------- Restore Admin ---------------------------

export async function restoreAdminController(req, res, next) {
  try {
    const { adminId } = req.params;

    const admin = await restoreAdminService(adminId);

    res.status(200).json({
      success: true,
      message: "Admin restored successfully",
      data: admin
    });
  } catch (error) {
    next(error);
  }
}