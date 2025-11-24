import { Admin } from "../../../models/admin/Admin.model.js";

export async function getProfile(userId) {
  const user = await Admin.findById(userId).select("-password");
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  return user;
}



//logout 
export async function logout(userId) {
  await Admin.findByIdAndUpdate(userId, { lastLogoutAt: new Date() });
  return { message: "Logged out successfully" };
}
