import express from "express";
import {
  getSummaryReport,
  getDriverReport,
  getPassengerReport,
  getRevenueReport,
  getRideReport,
  getDriverReportById,
  getPassengerReportById,
} from "../../controllers/admin/report/report.controller.js";
import {
  authenticateAdmin,
  authorizeAdmin,
} from "../../middleware/auth.middleware.js";
import { ROLE_PERMISSIONS } from "../../constants/userStatus.constants.js";

const router = express.Router();

router.get(
  "/summary",
  authenticateAdmin,
  authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_DRIVERS),
  getSummaryReport,
);
router.get(
  "/drivers",
  authenticateAdmin,
  authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_DRIVERS),
  getDriverReport,
);
router.get(
  "/passengers",
  authenticateAdmin,
  authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_DRIVERS),
  getPassengerReport,
);
router.get(
  "/revenue",
  authenticateAdmin,
  authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_DRIVERS),
  getRevenueReport,
);
router.get(
  "/rides",
  authenticateAdmin,
  authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_DRIVERS),
  getRideReport,
); 

router.get(
  "/drivers/:id",
  authenticateAdmin,
  authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_DRIVERS),
  getDriverReportById,
);

router.get(
  "/passengers/:id",
  authenticateAdmin,
  authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_DRIVERS),
  getPassengerReportById,
)

export default router;
