import { adminToken } from "../../../helpers/helper.js";
import { Admin } from "../../../models/admin/admin.model.js";

//---------------------- Admin Login----------------------
export async function login({ email, password }) {
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : email;
  const user = await Admin.findOne({ email: normalizedEmail }).select(
    "+password"
  );
  if (!user) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }
  const ok = await user.comparePassword(password);
  if (!ok) {
    const err = new Error("Password incorrect");
    err.status = 401;
    throw err;
  }
  const token = adminToken(user);

  const userData = user.toObject();
  delete userData.password;
  return { success: true,message:"Login Successfully", user: userData, token };
} 