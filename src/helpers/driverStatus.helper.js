import {
  DRIVER_APPROVAL_STATUS,
  DRIVER_AVAILABILITY_STATUS,
  USER_STATUS,
} from "../constants/userStatus.constants.js";

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

export function canDriverReceiveRide(driver) {
  return (
    isDriverReadyForRide(driver) &&
    driver?.isOnline === true &&
    driver?.driverStatus === DRIVER_AVAILABILITY_STATUS.AVAILABLE
  );
}

export function canDriverAcceptRide(driver) {
  return canDriverReceiveRide(driver);
}

export function driverRideEligibilityQuery(extra = {}) {
  // Keep ride discovery queryable in Mongo while mirroring isDriverReadyForRide.
  return {
    ...extra,
    approvalStatus: DRIVER_APPROVAL_STATUS.APPROVED,
    profileCompleted: true,
    documentsVerified: true,
    status: USER_STATUS.ACTIVE,
    isOnline: true,
    driverStatus: DRIVER_AVAILABILITY_STATUS.AVAILABLE,
  };
}

export function mapLegacyIsActiveToDriverStatus(isActive) {
  return isActive ? USER_STATUS.ACTIVE : USER_STATUS.INACTIVE;
}
