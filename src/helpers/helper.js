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