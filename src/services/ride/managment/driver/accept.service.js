
import { Ride } from "../../../../models/ride/ride.model.js";


export async function acceptRideService({ rideId, driverId }) {
const ride = await Ride.findOneAndUpdate(
{ _id: rideId, status: "pending" },
{ driver: driverId, status: "accepted", acceptedAt: new Date() },
{ new: true }
);


if (!ride) throw new Error("Ride not available or already accepted");


return ride;
} 

export async function startRideService({ rideId, driverId }) {
const ride = await Ride.findOneAndUpdate(
{ _id: rideId, driver: driverId, status: "accepted" },
{ status: "ongoing", startedAt: new Date() },
{ new: true }
);
if (!ride) throw new Error("Ride not found or cannot be started");
return ride;
}

export async function rejectRideService({ rideId, driverId }) {
    const ride = await Ride.findOneAndUpdate(
        { _id: rideId, driver: driverId, status: "accepted" },
        { driver: null, status: "pending", acceptedAt: null },
        { new: true }
    );
    if (!ride) throw new Error("Ride not found or cannot be rejected");
    return ride;
}