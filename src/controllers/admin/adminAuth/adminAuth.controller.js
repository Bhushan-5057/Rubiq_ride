import { login } from "../../../services/adminServices/adminAuthService/adminAuth.service.js";
import { registerSuperAdmin } from "../../../services/adminServices/adminManagementService/admin.management.service.js";

function sanitizeAdmin(admin) {
  const adminData = admin.toObject ? admin.toObject() : { ...admin };
  delete adminData.password;
  return adminData;
}

//---------------------- Super Admin Bootstrap Registration ----------------------
export async function registerSuperAdminController(req, res, next) {
  try {
    const { admin } = await registerSuperAdmin(req.body);
    return res.status(201).json({
      status: true,
      message: "SUPER_ADMIN registered successfully",
      data: { admin: sanitizeAdmin(admin) },
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ status: false, message: err.message });
    }
    next(err);
  }
}

//--------------------------------- Login Controller ---------------------------------
export async function loginController(req, res, next) {
  try {
    const result = await login(req.body);
    res.json(result);
  } catch (err) {
    if (err.message === "Invalid credentials") {
      return res.status(401).json({ status: false, message: "Invalid credentials" });
    }
    if (err.status) return res.status(err.status).json({ status: false, message: err.message });
    next(err);
  }
}

//--------------------------------- Logout Controller ---------------------------------
export async function logoutController(req, res) {
  res.status(200).json({
    status: true,
    message: "Admin Logout successful"
  });
}
