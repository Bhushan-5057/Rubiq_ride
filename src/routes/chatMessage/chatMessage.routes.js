import { getRideChat } from "../../controllers/chat/chatMessage.controller.js";
import { Router } from "express";
import { authenticateUser } from "../../middleware/auth.middleware.js";

const router=Router() 

//--------------- Chat Message Route ---------------
router.get("/:rideId/chat",authenticateUser,getRideChat) 

export default router 