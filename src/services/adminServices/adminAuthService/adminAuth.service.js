import { adminToken } from "../../../helpers/helper.js";
import { Admin } from "../../../models/admin/admin.model.js";

//---------------------- Register Admin ----------------------
export async function register({ email, password, name, contactNumber, gender }) {
  const existingAdmin = await Admin.findOne({ email });

  if (existingAdmin) {
    const error = new Error("Email already registered");
    error.status = 409;
    throw error;
  }

  const newAdmin = await Admin.create({
    email,
    password,
    name,
    contactNumber,
    gender,
    role: "admin",
  });

  const token = adminToken(newAdmin);
  return { newAdmin, token };
}

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

//---------------------- Admin logout ----------------------
export async function logout(adminId, token) {
  const admin = await Admin.findById(adminId);
  if (!admin) {
    const err = new Error("Admin not found");
    err.status = 404;
    throw err;
  }
  return { message: "Logout successful" };
}