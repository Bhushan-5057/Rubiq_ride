import { USER_STATUS } from "../constants/userStatus.constants.js";

export function isPassengerActive(passenger) {
  return passenger?.status === USER_STATUS.ACTIVE;
}

export function canPassengerLogin(passenger) {
  return isPassengerActive(passenger);
}

export function canPassengerBookRide(passenger) {
  return isPassengerActive(passenger) && passenger?.profileCompleted === true;
}

export function mapLegacyIsActiveToPassengerStatus(isActive) {
  return isActive ? USER_STATUS.ACTIVE : USER_STATUS.INACTIVE;
}

export function passengerActiveQuery(extra = {}) {
  // Passenger activity is now derived from status only; keep query shape reusable.
  return {
    ...extra,
    status: USER_STATUS.ACTIVE,
  };
}
