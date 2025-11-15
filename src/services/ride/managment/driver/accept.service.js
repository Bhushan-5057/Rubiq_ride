
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