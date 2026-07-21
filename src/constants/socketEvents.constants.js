export const SOCKET_EVENTS = Object.freeze({
  AUTH_ERROR: "auth_error",
  RIDE_REQUESTED: "new_ride_request",
  RIDE_CREATED: "ride_created",
  RIDE_DRIVER_ASSIGNED: "driver_assigned",
  DRIVER_ON_ROUTE: "driver_on_the_way",
  // Distinct from DRIVER_ON_ROUTE to avoid duplicate same-name payloads.
  DRIVER_LOCATION_UPDATED: "driver_location_updated",
  RIDE_DROP_LOCATION_UPDATED: "passenger_drop_location_updated",
  RIDE_CANCELLED_BY_PASSENGER: "ride.cancelled_by_passenger",
  RIDE_CANCELLED_BY_DRIVER: "ride.cancelled_by_driver",
  RIDE_MISSED: "ride.missed",
  DRIVER_ARRIVED: "driver_arrived",
  // Legacy typo kept for older clients that subscribed with a trailing space.
  DRIVER_ARRIVED_LEGACY: "driver_arrived ",
  RIDE_STARTED: "ride_started",
  RIDE_COMPLETED: "ride_completed",
  DRIVER_FEEDBACK_SENT: "driver_feedback_sent",
  PASSENGER_FEEDBACK_RECEIVED: "passenger_feedback_recieved",
  PASSENGER_FEEDBACK_SENT: "passenger_feedback_sent",
  DRIVER_FEEDBACK_RECEIVED: "driver_feedback_received",
});
