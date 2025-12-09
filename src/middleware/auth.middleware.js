import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Admin } from "../models/admin/admin.model.js";
import { Driver } from "../models/driver/driver.model.js";
import { Passenger } from "../models/passenger/passenger.model.js";
dotenv.config();

//------------------------------- Authenticate Admin -------------------------------
export async function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Missing token" });
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET missing in environment variables");
      return res
        .status(500)
        .json({ success: false, message: "Server misconfiguration" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Access restricted to admins only" });
    }

    const admin = await Admin.findById(decoded.sub).select("-password");
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    req.admin = admin;
    next();
  } catch (err) {
    console.error("Admin Auth Error:", err.message);

    // Handle specific JWT errors
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    res.status(401).json({
      success: false,
      message: "Authentication failed",
      error: err.message,
    });
  }
}

//------------------------------ Authenticate Driver ------------------------------ 
export async function authenticateDriver(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    
    if (!token)
      return res.status(401).json({ success: false, message: "Missing token" });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const driver = await Driver.findOne({ _id: decoded.sub  });
    
    if (!driver)
      return res.status(404).json({ success: false, message: "Driver not found" });

   req.driver  = driver;       
    next();
  } catch (err) {
    console.error("Driver Auth Error:", err.message);
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

//----------------------------- Authenticate Passenger -----------------------------
export async function authenticatePassenger(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token)
      return res.status(401).json({ success: false, message: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const passenger = await Passenger.findOne({_id:decoded.sub , status:"active"} );

    if (!passenger)
      return res.status(404).json({ success: false, message: "Passenger not found" });


    req.passenger = passenger;        
    next();
  } catch (err) {
    console.error("Passenger Auth Error:", err.message);
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}