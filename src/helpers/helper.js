import jwt from "jsonwebtoken";

// -------------------------------- Normalize Number --------------------------------
export function normalizeNumber(contactNumber) {
  if (!contactNumber.startsWith("+")) contactNumber = "+91" + contactNumber;
  return contactNumber;
}

// ----------------------------- Base Token Generator -----------------------------
export function generateToken({ _id, role }) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  if (!secret) throw new Error("JWT_SECRET not set");

  const payload = {
    sub: _id.toString(),
    role,
  };

  return jwt.sign(payload, secret, { expiresIn });
}

// ----------------------------- Role-Specific Helpers -----------------------------

export function adminToken(admin) {
  return generateToken({
    _id: admin._id,
    role: "admin",
  });
}

export function driverToken(driver) {
  return generateToken({
    _id: driver._id,
    role: "driver",
  });
}

export function passengerToken(passenger) {
  return generateToken({
    _id: passenger._id,
    role: "passenger",
  });
}
