import { Router } from "express";
import adminRoutes from "./adminRoutes/index.js";
import passengerRoutes from "./passengerRoutes/index.js";
import driverRoutes from "./driverRoutes/index.js";
import notificationRoutes from "./notificationRoutes/notification.routes.js"
import bankAccountRoutes from "./bankAccount/bankAccount.routes.js";
import chatMessageRoute from "./chatMessage/chatMessage.routes.js"
import googleMapsRoutes from "./maps/googleMaps.routes.js";
import uploadRoutes from "./upload.route.js";
import feedbackRoutes from "./feedback/feedback.routes.js";
import { getAllFeedback } from "../controllers/feedback/feedback.controller.js";
import { authenticateAdmin, authorizeAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.use((req, res, next) => {
    console.log("Called", req.path);
    next();
});

//--------------- Admin Route ---------------
router.use("/admin", adminRoutes);

//--------------- Passenger Route ---------------
router.use("/passenger", passengerRoutes);

//--------------- Driver Route ---------------
router.use("/drivers", driverRoutes);

//--------------- Notification Route ---------------
router.use("/notification", notificationRoutes);

//--------------- Bank Account Route ---------------
router.use("/bank-account", bankAccountRoutes);

//--------------- Chat Message Route ---------------
router.use("/rides", chatMessageRoute);

//--------------- Google Maps Route ---------------
router.use("/maps", googleMapsRoutes);

//--------------- Upload Route ---------------
router.use("/upload", uploadRoutes);

//--------------- Feedback Route ---------------
router.use("/feedback", feedbackRoutes);

export default router;
