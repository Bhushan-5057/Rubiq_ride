/** Ride request offer window before the current driver is marked missed. */
export const RIDE_REQUEST_TIMEOUT_MS = 10_000;

/** Canonical in-progress statuses after OTP verification. */
export const RIDE_IN_PROGRESS_STATUSES = Object.freeze(["started", "ongoing"]);

/** Statuses where a ride may still be cancelled. */
export const RIDE_CANCELLABLE_STATUSES = Object.freeze([
  "pending",
  "accepted",
  "driver_arrived",
]);
