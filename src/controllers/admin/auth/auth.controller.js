import { login, logout } from "../../../services/admin.service.js";
import { handleValidation } from "../../../validations/comman.validation.js";



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

    const result = await logout(req.user.id, token);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}