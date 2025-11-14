import jwt from "jsonwebtoken";

export function normalizeNumber(contactNumber) {
  if (!contactNumber.startsWith("+")) contactNumber = "+91" + contactNumber;
  return contactNumber;
}

export function signToken(user) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign({ sub: user._id }, secret, { expiresIn });
} 


export function adminToken(user) {
  const payload = { sub: user._id.toString(), role: user.role };
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  if (!secret) throw new Error("JWT_SECRET not set");
  return jwt.sign(payload, secret, { expiresIn });
}