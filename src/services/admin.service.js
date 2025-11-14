import jwt from "jsonwebtoken";
import { verifyOtp } from "./otp.service.js";
import { Admin } from "../models/admin/Admin.model.js";

function signToken(user) {
  const payload = { sub: user._id.toString(), role: user.role };
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  if (!secret) throw new Error("JWT_SECRET not set");
  return jwt.sign(payload, secret, { expiresIn });
}

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

  const token = signToken(newAdmin);

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
  const token = signToken(user);

  const userData = user.toObject();
  delete userData.password;
  return { success: true,message:"Login Successfully", user: userData, token };
}

export async function otpLogin({ contactNumber, otp, name }) {
  const ok = await verifyOtp(contactNumber, otp);
  if (!ok) {
    const err = new Error("Invalid or expired OTP");
    err.status = 401;
    throw err;
  }

  let user = await Admin.findOne({ contactNumber });
  if (!user) {
    user = await Admin.create({
      contactNumber,
      name: name || "User",
      role: "passenger",
    });
  }

  const token = signToken(user);
  return { user: user, token };
}

export async function getProfile(userId) {
  const user = await Admin.findById(userId).select("-password");
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  return user;
}

export async function logout(userId) {
  await Admin.findByIdAndUpdate(userId, { lastLogoutAt: new Date() });
  return { message: "Logged out successfully" };
}
