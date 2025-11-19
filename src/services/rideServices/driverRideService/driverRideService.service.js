
import { Ride } from "../../../models/ride/ride.model.js";

//service for driver to accept ride
export async function acceptRideService({ rideId, driverId }) {
const ride = await Ride.findOneAndUpdate(
{ _id: rideId, status: "pending" },
{ driver: driverId, status: "accepted", acceptedAt: new Date() },
{ new: true }
);

if (!ride) throw new Error("Ride not available or already accepted");

return ride;
} 

//service for driver to start ride
export async function startRideService({ rideId, driverId,otpForStartRide }) {
console.log("Start ride request - rideId:", rideId, "driverId:", driverId, "otpForStartRide:", otpForStartRide);

const ride = await Ride.findById(rideId);

if (!ride) {
  throw new Error("Ride not found");
}

if (!ride.driver || ride.driver.toString() !== driverId.toString()) {
  throw new Error("You are not assigned to this ride");
}

if (ride.status !== "accepted") {
  throw new Error(`Ride cannot be started in current status: ${ride.status}`);
}

const incomingOtp = Number(otpForStartRide);
if (ride.otpForStartRide !== incomingOtp) {
  throw new Error("Invalid OTP");
}

ride.status = "ongoing";
ride.startedAt = new Date();
await ride.save();

console.log("Ride after update:", ride);

return ride;
} 

export async function completeRideService({ rideId, driverId }) {
const ride = await Ride.findById(rideId);

if (!ride) {
  throw new Error("Ride not found");
}

if (!ride.driver || ride.driver.toString() !== driverId.toString()) {
  throw new Error("You are not assigned to this ride");
}

if (ride.status !== "ongoing") {
  throw new Error(`Ride cannot be completed in current status: ${ride.status}`);
}

ride.status = "completed";
ride.completedAt = new Date();
await ride.save(); 

return ride;

}

//service for driver to reject ride
export async function rejectRideService({ rideId, driverId }) {
    const ride = await Ride.findOneAndUpdate(
        { _id: rideId, driver: driverId, status: "accepted" },
        { driver: null, status: "pending", acceptedAt: null },
        { new: true }
    );
    if (!ride) throw new Error("Ride not found or cannot be rejected");
    return ride;
}