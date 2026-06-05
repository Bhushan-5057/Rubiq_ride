import {
  getAdminByIdService,
  getAllAdminsService,
  registerAdmin,
  updateAdminStatusService,
}
  from "../../../../services/adminServices/adminManagementService/admin.management.service.js";
import { sendSuccess } from "../../../../utils/apiResponse.js";


//----------------------------- Admin Create Controller -----------------------------
export async function createAdminController(req, res, next) {
  try {
    const { admin } = await registerAdmin(req.body, req.admin);

    const adminData = admin.toObject()
    delete adminData.password;

    return sendSuccess(res, 201, "Admin registered successfully", { admin: adminData });
  } catch (error) {
    next(error);
  }
}

export const registerAdminController = createAdminController;

// ---------------------------------------- Get All Admin ----------------------------------------
export async function getAllAdminsController(req, res, next) {
  try {
    const { page, limit, search, isActive } = req.query;

    const result = await getAllAdminsService({
      page,
      limit,
      search,
      isActive,
      excludeAdminId: req.admin._id,
    });

    return sendSuccess(res, 200, "Admins fetched successfully", result.admins, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

//------------------------ Get Admin By ID ------------------------

export async function getAdminByIdController(req, res, next) {
  try {
    const { adminId } = req.params;

    const admin = await getAdminByIdService(adminId);

    return sendSuccess(res, 200, "Admin fetched successfully", admin);
  } catch (error) {
    next(error);
  }
}

// --------------------------- Delete Admin -----------------------
export async function updateAdminStatusController(req, res, next) {
  try {
    const { adminId } = req.params;
    const { isActive } = req.body;

    const result = await updateAdminStatusService(adminId, isActive, req.admin);

    return sendSuccess(res, 200, result.message, result.admin);
  } catch (error) {
    next(error);
  }
}
