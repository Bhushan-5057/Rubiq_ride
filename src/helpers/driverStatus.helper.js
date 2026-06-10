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
  return Boolean(driver && driver.status !== USER_STATUS.INACTIVE && driver.status !== USER_STATUS.BLOCKED);
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
