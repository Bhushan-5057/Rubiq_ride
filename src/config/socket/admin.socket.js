import { ADMIN_ROLES } from "../../constants/userStatus.constants.js";
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

/** Admin realtime socket handlers disabled. */
export const registerAdminEvents = () => {};

/** Admin SOS / safety realtime handlers disabled. */
export const registerSafetyEvents = () => {};

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
};
