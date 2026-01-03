import { Admin } from "../../../models/admin/admin.model.js";

//----------------------- Get Profile -----------------------
export async function getProfile(userId) {
  const user = await Admin.findById(userId).select("-password");
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  return user;
}