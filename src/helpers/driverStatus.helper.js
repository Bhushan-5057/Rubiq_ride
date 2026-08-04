import {
  DRIVER_APPROVAL_STATUS,
  DRIVER_AVAILABILITY_STATUS,
  USER_STATUS,
} from "../constants/userStatus.constants.js";

/** Online drivers who may be offered / notified of new ride requests. */
export const DRIVER_STATUSES_CAN_RECEIVE_RIDES = [
  DRIVER_AVAILABILITY_STATUS.AVAILABLE,
  DRIVER_AVAILABILITY_STATUS.ON_TRIP,
];

export function isDriverReadyForRide(driver) {
  return (
    driver?.approvalStatus === DRIVER_APPROVAL_STATUS.APPROVED &&
    driver?.profileCompleted === true &&
    driver?.documentsVerified === true &&
    driver?.status === USER_STATUS.ACTIVE
  );
}

export function canDriverLogin(driver) {
  // Allow drivers to sign in for all lifecycle states so they can view
  // their account status and blocking/administrative notes. Ride-receiving
  // and booking eligibility remain governed by other helpers.
  return Boolean(driver);
}

/**
 * Whether the driver should receive new_ride_request offers / discovery.
 * AVAILABLE and ON_TRIP both qualify (online + approved). Accepting is separate.
 */
export function canDriverReceiveRide(driver) {
  return (
    isDriverReadyForRide(driver) &&
    driver?.isOnline === true &&
    DRIVER_STATUSES_CAN_RECEIVE_RIDES.includes(driver?.driverStatus)
  );
}

/**
 * Whether the driver may take a new ride right now.
 * ON_TRIP drivers can still receive notifications but must finish/free up first.
 */
export function canDriverAcceptRide(driver) {
  return (
    isDriverReadyForRide(driver) &&
    driver?.isOnline === true &&
    driver?.driverStatus === DRIVER_AVAILABILITY_STATUS.AVAILABLE &&
    !driver?.currentRide
  );
}

/** Shared Mongo filter for approved, active, online drivers. */
function baseOnlineReadyFilter(extra = {}) {
  return {
    ...extra,
    approvalStatus: DRIVER_APPROVAL_STATUS.APPROVED,
    profileCompleted: true,
    documentsVerified: true,
    status: USER_STATUS.ACTIVE,
    isOnline: true,
  };
}

/**
 * Discovery / nearby / auto-offer: include free and on-trip drivers
 * so on_trip still gets new_ride_request notifications.
 */
export function driverRideReceiveEligibilityQuery(extra = {}) {
  return {
    ...baseOnlineReadyFilter(extra),
    driverStatus: { $in: DRIVER_STATUSES_CAN_RECEIVE_RIDES },
  };
}

/**
 * Accept-time eligibility: free drivers only (AVAILABLE, no currentRide).
 * @deprecated Prefer canDriverAcceptRide after loading the driver document.
 * Kept for query shapes that must only surface free drivers.
 */
export function driverRideEligibilityQuery(extra = {}) {
  return {
    ...baseOnlineReadyFilter(extra),
    driverStatus: DRIVER_AVAILABILITY_STATUS.AVAILABLE,
    currentRide: null,
  };
}

export function mapLegacyIsActiveToDriverStatus(isActive) {
  return isActive ? USER_STATUS.ACTIVE : USER_STATUS.INACTIVE;
}

/**
 * Human-readable reason when accept is blocked.
 */
export function getDriverAcceptBlockedMessage(driver) {
  if (!driver) return "Driver is not eligible to accept rides";
  if (!isDriverReadyForRide(driver)) {
    return "Driver profile is not fully approved for rides";
  }
  if (driver.isOnline !== true) {
    return "Go online to accept ride requests";
  }
  if (
    driver.driverStatus === DRIVER_AVAILABILITY_STATUS.ON_TRIP ||
    driver.currentRide
  ) {
    return "Complete your current ride before accepting a new request";
  }
  if (driver.driverStatus === DRIVER_AVAILABILITY_STATUS.UNAVAILABLE) {
    return "Driver is unavailable for rides";
  }
  return "Driver is not eligible to accept rides";
}
