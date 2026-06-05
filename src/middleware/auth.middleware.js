import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Admin } from "../models/admin/admin.model.js";
import { Driver } from "../models/driver/driver.model.js";
import { Passenger } from "../models/passenger/passenger.model.js";
import { ACTIVE_USER_FILTER } from "../constants/userStatus.constants.js";
dotenv.config();

//------------------------------- Authenticate Admin -------------------------------
export async function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ status: false, message: "Missing token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findOne({ _id: decoded.sub, ...ACTIVE_USER_FILTER }).select("-password");

    if (!admin) {
      return res.status(401).json({
        status: false,
        message: "Admin not found or inactive",
      });
    }

    req.admin = admin;
    req.adminRole = admin.role;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ status: false, message: "Token expired" });
    }
    return res.status(401).json({ status: false, message: "Invalid token" });
  }
}

//---------------------- Authorize Admin ----------------------
export const authorizeAdmin = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.adminRole)) {
      return res.status(403).json({
        status: false,
        message: "Access denied"
      });
    }
    next();
  };
};

//------------------------------ Authenticate Driver ------------------------------ 
export async function authenticateDriver(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token)
      return res.status(401).json({ status: false, message: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const driver = await Driver.findOne({ _id: decoded.sub, ...ACTIVE_USER_FILTER });

    if (!driver)
      return res.status(404).json({ status: false, message: "Driver not found or inactive" });

    req.driver = driver;
    next();
  } catch (err) {
    console.error("Driver Auth Error:", err.message);
    res.status(401).json({ status: false, message: "Invalid or expired token" });
  }
}

//----------------------------- Authenticate Passenger -----------------------------
export async function authenticatePassenger(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token)
      return res.status(401).json({ status: false, message: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const passenger = await Passenger.findOne({ _id: decoded.sub, ...ACTIVE_USER_FILTER });

    if (!passenger)
      return res.status(404).json({ status: false, message: "Passenger not found or inactive" });

    req.passenger = passenger;
    next();
  } catch (err) {
    console.error("Passenger Auth Error:", err.message);
    res.status(401).json({ status: false, message: "Invalid or expired token" });
  }
}

//------------------------------ Authenticate User (Driver or Passenger) ------------------------------
export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ status: false, message: "Missing token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try to find the user in either Passenger or Driver collection
    const [passenger, driver] = await Promise.all([
      Passenger.findOne({ _id: decoded.sub, ...ACTIVE_USER_FILTER }),
      Driver.findOne({ _id: decoded.sub, ...ACTIVE_USER_FILTER })
    ]);

    if (!passenger && !driver) {
      return res.status(404).json({ status: false, message: "User not found or inactive" });
    }

    // Attach the user to the request object
    req.user = passenger || driver;
    req.user.role = passenger ? 'passenger' : 'driver';

    next();
  } catch (err) {
    console.error("Authentication Error:", err.message);
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ status: false, message: "Token expired" });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ status: false, message: "Invalid token" });
    }
    res.status(401).json({ status: false, message: "Authentication failed" });
  }
}

//------------------------------ Protect Route Middleware ------------------------------
export async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ status: false, message: "Authorization token missing" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decoded = { sub, role, iat, exp }
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({ status: false, message: "Invalid or expired token" });
  }
};
