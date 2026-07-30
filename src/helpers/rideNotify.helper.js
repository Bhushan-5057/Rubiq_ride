import {
  emitToDriver,
  emitToPassenger,
  getIO,
  getRoleRoom,
} from "../config/socket/socket.js";
import { Driver } from "../models/driver/driver.model.js";
import { Passenger } from "../models/passenger/passenger.model.js";
import { sendToUser } from "../services/notification/sendToUser.js";

function toIdString(value) {
  if (!value) return null;
  if (typeof value === "object" && value._id) {
    return value._id.toString();
  }
  return value.toString?.() || String(value);
}

/**
 * Valid recipients for ride-scoped events:
 * - ride.passenger
 * - ride.driver (assigned after accept)
 * - current offered driver only while pending / cancel-before-accept
 *   (never the nearby pool)
 */
export function getAllowedRideRecipientIds(ride, { allowOfferedDriver = false } = {}) {
  const allowed = new Set();

  const passengerId = toIdString(ride?.passenger);
  const driverId = toIdString(ride?.driver);

  if (passengerId) allowed.add(passengerId);
  if (driverId) allowed.add(driverId);

  if (allowOfferedDriver || (!driverId && ride?.status === "pending")) {
    const offered =
      toIdString(ride?._offeredDriverId) ||
      toIdString(ride?.currentOfferedDriver);
    if (offered) allowed.add(offered);
  }

  return allowed;
}

export function isAllowedRideRecipient(ride, userId, options) {
  const id = toIdString(userId);
  if (!id) return false;
  return getAllowedRideRecipientIds(ride, options).has(id);
}

export async function isUserSocketOnline(role, userId) {
  const id = toIdString(userId);
  if (!id || !role) return false;

  try {
    const sockets = await getIO().in(getRoleRoom(role, id)).fetchSockets();
    return sockets.length > 0;
  } catch {
    // Socket not initialized (e.g. standalone worker) → treat as offline.
    return false;
  }
}

/**
 * Ride-scoped delivery:
 * 1) Ignore recipients outside ride participants
 * 2) Drivers: socket ONLY when isOnline + socket connected.
 *    Offline / disconnected drivers get NOTHING (no FCM for ride flow).
 * 3) Passengers: online → socket; offline → push (when push config provided)
 */
export async function notifyRideParticipant({
  ride,
  userId,
  role,
  event,
  payload,
  push = null,
  allowOfferedDriver = false,
}) {
  const id = toIdString(userId);

  if (!id || !role || !event) {
    return { delivered: false, reason: "invalid_args" };
  }

  if (!isAllowedRideRecipient(ride, id, { allowOfferedDriver })) {
    console.warn(
      `Blocked non-participant ride notify: event=${event} role=${role} userId=${id} rideId=${toIdString(ride?._id)}`,
    );
    return { delivered: false, reason: "not_participant" };
  }

  // ---- Drivers: never FCM for ride events ----
  if (role === "driver") {
    const driver = await Driver.findById(id).select("isOnline");
    if (!driver?.isOnline) {
      console.log(
        `Skip ride notify for offline driver ${id} event=${event}`,
      );
      return { delivered: false, reason: "driver_offline" };
    }

    const connected = await isUserSocketOnline("driver", id);
    if (!connected) {
      console.log(
        `Skip ride notify for disconnected driver ${id} event=${event}`,
      );
      return { delivered: false, reason: "driver_not_connected" };
    }

    emitToDriver(id, event, payload);
    return { delivered: true, channel: "socket" };
  }

  // ---- Passengers: socket if connected, else push ----
  const online = await isUserSocketOnline("passenger", id);

  if (online) {
    emitToPassenger(id, event, payload);
    return { delivered: true, channel: "socket" };
  }

  if (!push?.title) {
    return { delivered: false, reason: "offline_no_push" };
  }

  const passenger = await Passenger.findById(id).select("fcmTokens");
  await sendToUser({
    user: passenger,
    title: push.title,
    body: push.body || "",
    data: {
      type: event,
      ...(push.data || {}),
    },
    userType: "passenger",
  });

  return { delivered: true, channel: "push" };
}

/**
 * Notify both ride participants (assigned driver + passenger only).
 * Does not use nearby drivers / geo / pools.
 * driverPush is ignored — drivers never receive FCM for ride flow.
 */
export async function notifyRideParticipants({
  ride,
  event,
  payload,
  passengerPush = null,
  allowOfferedDriver = false,
}) {
  const results = [];

  const passengerId = toIdString(ride?.passenger);
  if (passengerId) {
    results.push(
      await notifyRideParticipant({
        ride,
        userId: passengerId,
        role: "passenger",
        event,
        payload,
        push: passengerPush,
        allowOfferedDriver,
      }),
    );
  }

  const driverId =
    toIdString(ride?.driver) ||
    (allowOfferedDriver
      ? toIdString(ride?._offeredDriverId) ||
        toIdString(ride?.currentOfferedDriver)
      : null);

  if (driverId) {
    results.push(
      await notifyRideParticipant({
        ride,
        userId: driverId,
        role: "driver",
        event,
        payload,
        allowOfferedDriver,
      }),
    );
  }

  return results;
}

/**
 * Discovery-phase notify for a single offered driver.
 * Socket only when driver is online + connected. Never FCM.
 */
export async function notifyOfferedDriver({
  driverId,
  event,
  payload,
}) {
  const id = toIdString(driverId);
  if (!id || !event) {
    return { delivered: false, reason: "invalid_args" };
  }

  const driver = await Driver.findById(id).select("isOnline");
  if (!driver?.isOnline) {
    console.log(
      `Skip discovery notify for offline driver ${id} event=${event}`,
    );
    return { delivered: false, reason: "driver_offline" };
  }

  const connected = await isUserSocketOnline("driver", id);
  if (!connected) {
    console.log(
      `Skip discovery notify for disconnected driver ${id} event=${event}`,
    );
    return { delivered: false, reason: "driver_not_connected" };
  }

  emitToDriver(id, event, payload);
  return { delivered: true, channel: "socket" };
}
