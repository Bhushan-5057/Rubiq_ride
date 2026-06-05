import { adminToken } from "../../../helpers/helper.js";
import { adminRepository } from "../../../repositories/admin.repository.js";

//---------------------- Admin Login----------------------
export async function login({ email, password }) {
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : email;
  const user = await adminRepository.findByEmail(normalizedEmail, { withPassword: true });
  if (!user) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }
  if (user.isActive === false) {
    const err = new Error("Admin account is inactive");
    err.status = 403;
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
  return { status: true, message: "Login Successfully", data: { token, user: userData } };
} 
