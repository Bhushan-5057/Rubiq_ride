import { login } from "../../../services/adminServices/adminAuthService/adminAuth.service.js";

//--------------------------------- Login Controller ---------------------------------
export async function loginController(req, res, next) {
  try {
    const result = await login(req.body);
    res.json(result);
  } catch (err) {
    if (err.message === "Invalid credentials") {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    next(err);
  }
}

//--------------------------------- Logout Controller ---------------------------------
export async function logoutController(req, res) {
  res.status(200).json({
    success: true,
    message: "Admin Logout successful"
  });
}