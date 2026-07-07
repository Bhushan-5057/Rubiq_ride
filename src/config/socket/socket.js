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
import { ACTIVE_USER_FILTER, ADMIN_ROLES, USER_STATUS } from "../../constants/userStatus.constants.js";
import { passengerActiveQuery } from "../../helpers/passengerStatus.helper.js";

let ioInstance;

export const SOCKET_EVENTS = Object.freeze({
  AUTH_ERROR: "auth_error",
  RIDE_REQUESTED: "new_ride_request",
  RIDE_CREATED: "ride_created",
  RIDE_DRIVER_ASSIGNED: "driver_assigned",
  DRIVER_ON_ROUTE: "driver_on_the_way",
  DRIVER_LOCATION_UPDATED: "driver_on_the_way",
  RIDE_DROP_LOCATION_UPDATED: "passenger_drop_location_updated",
  RIDE_CANCELLED_BY_PASSENGER: "ride.cancelled_by_passenger",
  RIDE_CANCELLED_BY_DRIVER: "ride.cancelled_by_driver",
  RIDE_MISSED: "ride.missed",
  DRIVER_ARRIVED: "driver_arrived ",
  RIDE_STARTED: "ride_started",
  RIDE_COMPLETED: "ride_completed",
  DRIVER_FEEDBACK_SENT: "driver_feedback_sent",
  PASSENGER_FEEDBACK_RECEIVED: "passenger_feedback_recieved",
  PASSENGER_FEEDBACK_SENT: "passenger_feedback_sent",
  DRIVER_FEEDBACK_RECEIVED: "driver_feedback_received",
});

export const getRoleRoom = (role, userId) => `${role}_${userId.toString()}`;

export const emitToPassenger = (passengerId, event, payload) => {
  getIO().to(getRoleRoom("passenger", passengerId)).emit(event, payload);
};

export const emitToDriver = (driverId, event, payload) => {
  getIO().to(getRoleRoom("driver", driverId)).emit(event, payload);
};

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
        user = await Driver.findOne({ _id: userId, status: { $nin: [USER_STATUS.INACTIVE, USER_STATUS.BLOCKED] } }).select("_id status");
      } else if (role === "passenger") {
        user = await Passenger.findOne(passengerActiveQuery({ _id: userId })).select("_id status");
      } else {
        const [passenger, driver, admin] = await Promise.all([
          Passenger.findOne(passengerActiveQuery({ _id: userId })).select("_id status"),
          Driver.findOne({ _id: userId, status: { $nin: [USER_STATUS.INACTIVE, USER_STATUS.BLOCKED] } }).select("_id status"),
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
    const roleRoom = getRoleRoom(socket.user.role, socket.user.id);
    socket.join(roleRoom);
    console.log(`User ${socket.user.id} joined role room ${roleRoom}`);

    registerDriverPresenceEvents(socket);
    registerAdminEvents(io, socket);
    registerSafetyEvents(socket);

    socket.on("register", ({ userId }, ack) => {
      if (!userId) return;
      const room = userId.toString();
      if (room !== socket.user?.id) {
        socket.emit(SOCKET_EVENTS.AUTH_ERROR, "Cannot register another user's socket room");
        if (typeof ack === "function") {
          ack({ success: false, message: "Cannot register another user's socket room" });
        }
        return;
      }
      const registeredRoleRoom = getRoleRoom(socket.user.role, room);
      if (!socket.rooms.has(registeredRoleRoom)) {
        socket.join(registeredRoleRoom);
        console.log(`User ${userId} joined role room ${registeredRoleRoom}`);
      }
      if (typeof ack === "function") {
        ack({ success: true, room: registeredRoleRoom, message: "Role room registered" });
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
