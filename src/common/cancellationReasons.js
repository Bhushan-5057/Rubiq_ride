export const PASSENGER_CANCELLATION_REASONS = {
  CHANGE_OF_PLAN: "Changed my plans",
  BOOKED_BY_MISTAKE: "Booked the ride by mistake",
  FOUND_OTHER_RIDE: "Found another ride",
  NO_LONGER_NEEDED: "I no longer need the ride",
  DRIVER_TOO_FAR: "Driver is too far away",
  DRIVER_NOT_MOVING: "Driver is not moving",
  DRIVER_UNRESPONSIVE: "Driver is not responding",
  WRONG_VEHICLE_DETAILS: "Vehicle details do not match",
  LOW_DRIVER_RATING: "Driver rating is too low",
  WRONG_PICKUP_LOCATION: "Pickup location is incorrect",
  PICKUP_DIFFICULT: "Pickup location is difficult",
  WAIT_TIME_TOO_LONG: "Waiting time is too long",
  FARE_TOO_HIGH: "Fare is too high",
  PAYMENT_METHOD_ISSUE: "Payment method issue",
  SAFETY_CONCERN: "I have a safety concern",
  VEHICLE_CONDITION_POOR: "Vehicle condition is poor",
  OTHER: "Other"
}; 

export const DRIVER_CANCELLATION_REASONS = {
  PASSENGER_NO_SHOW: "Passenger did not show up",
  PASSENGER_NOT_RESPONDING: "Passenger is not responding",
  WRONG_PICKUP_LOCATION: "Wrong pickup location",
  TOO_MANY_PASSENGERS: "Too many passengers",
  PASSENGER_BEHAVIOR_ISSUE: "Passenger behavior issue",
  VEHICLE_BREAKDOWN: "Vehicle breakdown",
  VEHICLE_ISSUE: "Vehicle issue",
  LOW_FUEL: "Low fuel",
  ROUTE_NOT_FEASIBLE: "Route is not feasible",
  HEAVY_TRAFFIC: "Heavy traffic on route",
  PICKUP_INACCESSIBLE: "Pickup location is inaccessible",
  PERSONAL_EMERGENCY: "Personal emergency",
  HEALTH_ISSUE: "Health issue",
  APP_ISSUE: "App issue",
  GPS_ISSUE: "GPS issue",
  OTHER: "Other"
}; 

export const PASSENGER_REASON_CODES = Object.keys(PASSENGER_CANCELLATION_REASONS);
export const DRIVER_REASON_CODES = Object.keys(DRIVER_CANCELLATION_REASONS);