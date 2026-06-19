import { Router } from "express";

import {
  authenticateAdmin,
  authorizeAdmin,
} from "../../middleware/auth.middleware.js";

import {
  getPricing,
  updatePricing,
} from "../../controllers/admin/pricing/pricing.controller.js";

import { ROLE_PERMISSIONS } from "../../constants/userStatus.constants.js";

const router = Router();

router.get(
  "/",
  authenticateAdmin,
  authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_RIDES),
  getPricing,
);

router.put(
  "/",
  authenticateAdmin,
  authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_RIDES),
  updatePricing,
);

export default router;
