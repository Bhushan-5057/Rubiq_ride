import { ADMIN_SOCKET_ROOMS } from "../config/socket/admin-socket.constants.js";
import { getIO } from "../config/socket/socket.js";
import { Driver } from "../models/driver/driver.model.js";
import { Passenger } from "../models/passenger/passenger.model.js";
import { Ride } from "../models/ride/ride.model.js";

const DEFAULT_ADMIN_ROOMS = [
  ADMIN_SOCKET_ROOMS.GLOBAL,
  ADMIN_SOCKET_ROOMS.NOTIFICATIONS,
];

const serializeId = (value) => value?.toString?.() ?? value;

export const emitAdminEvent = (event, payload = {}, options = {}) => {
  const io = getIO();
  const rooms = options.rooms?.length ? options.rooms : DEFAULT_ADMIN_ROOMS;
  const data = {
    ...payload,
    emittedAt: payload.emittedAt || new Date().toISOString(),
  };

  rooms.forEach((room) => {
    io.to(room).emit(event, data);
  });

  return data;
};

export const getAdminDashboardStats = async () => {
  const [
    activeRideCount,
    pendingRideCount,
    completedRideCount,
    cancelledRideCount,
    onlineDriverCount,
    activePassengerCount,
  ] = await Promise.all([
    Ride.countDocuments({ status: { $in: ["accepted", "ongoing", "started"] }, isActive: true }),
    Ride.countDocuments({ status: "pending", isActive: true }),
    Ride.countDocuments({ status: "completed", isActive: true }),
    Ride.countDocuments({ status: "cancelled", isActive: true }),
    Driver.countDocuments({ isOnline: true, isActive: true }),
    Passenger.countDocuments({ isActive: true }),
  ]);

  return {
    activeRideCount,
    pendingRideCount,
    completedRideCount,
    cancelledRideCount,
    onlineDriverCount,
    activePassengerCount,
  };
};

export const emitAdminDashboardStats = async (extra = {}) => {
  const stats = await getAdminDashboardStats();
  return emitAdminEvent(
    "admin:dashboard_stats",
    { ...stats, ...extra },
    { rooms: [ADMIN_SOCKET_ROOMS.DASHBOARD] }
  );
};

export const emitAdminRideEvent = async (event, ride, extra = {}) => {
  const ridePayload = {
    rideId: serializeId(ride?._id),
    passengerId: serializeId(ride?.passenger?._id || ride?.passenger),
    driverId: serializeId(ride?.driver?._id || ride?.driver),
    status: ride?.status,
    pickup: ride?.pickup,
    drop: ride?.drop,
    vehicleType: ride?.vehicleType,
    fareEstimate: ride?.fareEstimate,
    paymentMethod: ride?.paymentMethod,
    paymentStatus: ride?.paymentStatus,
    ...extra,
  };

  emitAdminEvent(event, ridePayload);
  emitAdminEvent("admin:live_booking_feed", ridePayload, {
    rooms: [ADMIN_SOCKET_ROOMS.DASHBOARD],
  });

  await emitAdminDashboardStats();
  return ridePayload;
};

export const emitAdminDriverLocation = (driver, payload = {}) => {
  return emitAdminEvent(
    "admin:driver_location",
    {
      driverId: serializeId(driver?._id || payload.driverId),
      driver,
      ...payload,
    },
    { rooms: [ADMIN_SOCKET_ROOMS.DASHBOARD] }
  );
};

export const emitAdminComplaintEvent = async (complaint) => {
  return emitAdminEvent("admin:new_complaint", {
    complaintId: serializeId(complaint?._id),
    raisedBy: serializeId(complaint?.raisedBy),
    raisedByUser: complaint?.raisedByUser,
    category: complaint?.category,
    status: complaint?.status,
    priority: complaint?.priority,
  });
};

export const emitAdminPayoutNotification = (payload) => {
  return emitAdminEvent("admin:payout_notification", payload);
};

export const emitAdminSupportChatEvent = (payload) => {
  return emitAdminEvent("admin:support_chat_monitor", payload, {
    rooms: [ADMIN_SOCKET_ROOMS.NOTIFICATIONS, ADMIN_SOCKET_ROOMS.DASHBOARD],
  });
};
