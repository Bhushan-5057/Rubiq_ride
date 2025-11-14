import { adminToken } from "../../../helpers/helper.js";
import { Admin } from "../../../models/admin/Admin.model.js";

export async function register({ email, password, name, contactNumber, gender, role }) {
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
    role,
  });

  const token = adminToken(newAdmin);

  return { newAdmin, token };
}


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