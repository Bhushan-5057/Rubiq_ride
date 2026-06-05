import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { registerChatEvents } from "./chat.socket.js";
import {
  emitDriverOffline,
  registerAdminEvents,
  registerDriverPresenceEvents,
  registerSafetyEvents,
} from "./admin.socket.js";
import { Admin } from "../../models/admin/admin.model.js";
import { Driver } from "../../models/driver/driver.model.js";
import { Passenger } from "../../models/passenger/passenger.model.js";
import { ACTIVE_USER_FILTER, ADMIN_ROLES } from "../../constants/userStatus.constants.js";

let ioInstance;

export const initSocket = (server) => {
  const allowedOrigins = [
    "http://localhost:5173",
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  const io = new Server(server, {
    transports: ["websocket", "polling"],
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.sub || decoded.id;
      const role = decoded.role;

      let user = null;
      let userType = role;

      if ([ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN].includes(role)) {
        user = await Admin.findOne({ _id: userId, ...ACTIVE_USER_FILTER }).select("_id role isActive");
      } else if (role === "driver") {
        user = await Driver.findOne({ _id: userId, ...ACTIVE_USER_FILTER }).select("_id isActive status");
      } else if (role === "passenger") {
        user = await Passenger.findOne({ _id: userId, ...ACTIVE_USER_FILTER }).select("_id isActive status");
      } else {
        const [passenger, driver, admin] = await Promise.all([
          Passenger.findOne({ _id: userId, ...ACTIVE_USER_FILTER }).select("_id isActive status"),
          Driver.findOne({ _id: userId, ...ACTIVE_USER_FILTER }).select("_id isActive status"),
          Admin.findOne({ _id: userId, ...ACTIVE_USER_FILTER }).select("_id role isActive"),
        ]);

        user = passenger || driver || admin;
        userType = passenger ? "passenger" : driver ? "driver" : admin?.role;
      }

      if (!user) {
        return next(new Error("Unauthorized"));
      }

      socket.user = { id: user._id.toString(), role: userType };
      next();
    } catch (error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    registerDriverPresenceEvents(socket);
    registerAdminEvents(io, socket);
    registerSafetyEvents(socket);

    socket.on("register", ({ userId }, ack) => {
      if (!userId) return;
      const room = userId.toString();
      if (room !== socket.user?.id) {
        socket.emit("auth_error", "Cannot register another user's socket room");
        if (typeof ack === "function") {
          ack({ success: false, message: "Cannot register another user's socket room" });
        }
        return;
      }
      if (!socket.rooms.has(room)) {
        socket.join(room);
        console.log(`User ${userId} joined their personal room`);
      }
      if (typeof ack === "function") {
        ack({ success: true, room, message: "Personal room registered" });
      }
    });

    registerChatEvents(io, socket);

    socket.on("disconnect", async () => {
      console.log("Socket disconnected:", socket.id);
      try {
        await emitDriverOffline(socket);
      } catch (error) {
        console.error("Driver disconnect realtime update failed:", error.message);
      }
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = () => {
  if (!ioInstance) throw new Error("Socket.io not initialized!");
  return ioInstance;
};
