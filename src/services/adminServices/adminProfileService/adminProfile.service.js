import { Admin } from "../../../models/admin/admin.model.js";

//get profile
export async function getProfile(userId) {
  const user = await Admin.findById(userId).select("-password");
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  return user;
}

//update profile
export async function updateProfile(userId, updateData) {
  const user = await Admin.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  const { name, email, password } = updateData;
  if (name) user.name = name;
  if (email) user.email = email;
  if (password) user.password = password;
  await user.save();
  return user;
}
