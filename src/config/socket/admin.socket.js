import {
  ADMIN_ROLES,
} from "../../constants/userStatus.constants.js";
import { emitAdminDashboardStats, emitAdminEvent } from "../../helpers/admin-realtime.helper.js";
import { Driver } from "../../models/driver/driver.model.js";
import { ADMIN_SOCKET_EVENTS, ADMIN_SOCKET_ROOMS } from "./admin-socket.constants.js";

export { ADMIN_SOCKET_EVENTS, ADMIN_SOCKET_ROOMS };

const activeDriverSockets = new Map();

export const isAdminSocketRole = (role) =>
  [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN].includes(role);

export const getAdminRoomsForRole = (role) => {
  const rooms = [
    ADMIN_SOCKET_ROOMS.GLOBAL,
    ADMIN_SOCKET_ROOMS.NOTIFICATIONS,
    ADMIN_SOCKET_ROOMS.DASHBOARD,
  ];

  if (role === ADMIN_ROLES.SUPER_ADMIN) {
    rooms.push(ADMIN_SOCKET_ROOMS.SUPER_ADMIN);
  }

  return rooms;
};

export const registerAdminEvents = (io, socket) => {
  if (!isAdminSocketRole(socket.user?.role)) return;

  const rooms = getAdminRoomsForRole(socket.user.role);
  rooms.forEach((room) => socket.join(room));

  socket.emit(ADMIN_SOCKET_EVENTS.REGISTERED, {
    adminId: socket.user.id,
    role: socket.user.role,
    rooms,
    connectedAt: new Date().toISOString(),
  });

  emitAdminDashboardStats().catch((error) => {
    console.error("Failed to emit admin dashboard stats:", error.message);
  });

  socket.on(ADMIN_SOCKET_EVENTS.JOIN_DASHBOARD, async (_payload = {}, ack) => {
    socket.join(ADMIN_SOCKET_ROOMS.DASHBOARD);
    const response = {
      success: true,
      room: ADMIN_SOCKET_ROOMS.DASHBOARD,
      message: "Joined admin dashboard realtime room",
    };
    if (typeof ack === "function") ack(response);
    await emitAdminDashboardStats();
  });

  socket.on(ADMIN_SOCKET_EVENTS.LEAVE_DASHBOARD, (_payload = {}, ack) => {
    socket.leave(ADMIN_SOCKET_ROOMS.DASHBOARD);
    const response = {
      success: true,
      room: ADMIN_SOCKET_ROOMS.DASHBOARD,
      message: "Left admin dashboard realtime room",
    };
    if (typeof ack === "function") ack(response);
  });

  socket.on(ADMIN_SOCKET_EVENTS.REQUEST_DASHBOARD_STATS, async (_payload = {}, ack) => {
    try {
      const stats = await emitAdminDashboardStats();
      if (typeof ack === "function") ack({ success: true, stats });
    } catch (error) {
      if (typeof ack === "function") ack({ success: false, message: error.message });
    }
  });

  socket.on(ADMIN_SOCKET_EVENTS.BROADCAST_NOTIFICATION, (payload = {}, ack) => {
    if (!payload.title && !payload.message) {
      const response = {
        success: false,
        message: "title or message is required",
      };
      if (typeof ack === "function") ack(response);
      return;
    }

    emitAdminEvent("admin:broadcast_notification", {
      ...payload,
      sentBy: socket.user.id,
      sentByRole: socket.user.role,
      emittedAt: new Date().toISOString(),
    });

    if (typeof ack === "function") {
      ack({ success: true, message: "Admin broadcast notification emitted" });
    }
  });
};

export const registerSafetyEvents = (socket) => {
  socket.on(ADMIN_SOCKET_EVENTS.SOS_ALERT, (payload = {}, ack) => {
    if (!payload.rideId && !payload.location) {
      const response = {
        success: false,
        message: "rideId or location is required for SOS alerts",
      };
      if (typeof ack === "function") ack(response);
      return;
    }

    emitAdminEvent("admin:sos_alert", {
      ...payload,
      userId: socket.user?.id,
      userRole: socket.user?.role,
      socketId: socket.id,
    });

    if (typeof ack === "function") {
      ack({ success: true, message: "SOS alert delivered to admin realtime rooms" });
    }
  });
};

export const registerDriverPresenceEvents = (socket) => {
  if (socket.user?.role !== "driver") return;

  const driverId = socket.user.id;
  const sockets = activeDriverSockets.get(driverId) || new Set();
  const wasOffline = sockets.size === 0;
  sockets.add(socket.id);
  activeDriverSockets.set(driverId, sockets);

  if (wasOffline) {
    Driver.findByIdAndUpdate(driverId, {
      isOnline: true,
      lastOnline: new Date(),
    }).catch((error) => {
      console.error("Failed to mark driver online:", error.message);
    });

    emitAdminEvent("admin:driver_online", {
      driverId,
      socketId: socket.id,
      onlineAt: new Date().toISOString(),
    });
  }
};

export const emitDriverOffline = async (socket) => {
  if (socket.user?.role !== "driver") return;

  const driverId = socket.user.id;
  const sockets = activeDriverSockets.get(driverId);

  if (sockets) {
    sockets.delete(socket.id);
    if (sockets.size > 0) return;
    activeDriverSockets.delete(driverId);
  }

  await Driver.findByIdAndUpdate(driverId, {
    isOnline: false,
    lastOffline: new Date(),
  });

  emitAdminEvent("admin:driver_offline", {
    driverId,
    socketId: socket.id,
    offlineAt: new Date().toISOString(),
  });

  await emitAdminDashboardStats();
};
