import { login,logout,register } from "../../../services/adminServices/adminAuthService/adminAuth.service.js";
import { handleValidation } from "../../../validations/comman.validation.js";

//register controller
export async function registerController(req, res, next) {
  try {
    const { newAdmin, token } = await register(req.body);

    const adminData = newAdmin._doc ? { ...newAdmin._doc } : { ...newAdmin };
    delete adminData.password;

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        admin: adminData,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

//login controller
export async function loginController(req, res, next) {
  try {
    handleValidation(req);
    const result = await login(req.body);
    res.json(result);
  } catch (err) {
    if (err.message === "Invalid credentials") {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    next(err); 
  }
}


//logout controller
export async function logoutController(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      const err = new Error('Token not provided');
      err.status = 400;
      throw err;
    }

    const result = await logout(req.admin.id, token);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}