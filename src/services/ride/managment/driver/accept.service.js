
import { Ride } from "../../../../models/ride/ride.model.js";
import { io } from "../../../../server.js";

// export async function acceptRideService({ rideId, driverId }) {
//   const ride = await Ride.findOneAndUpdate(
//     { _id: rideId, status: "pending" }, 
//     {
//       $set: {
//         driver: driverId,
//         status: "accepted",
//         acceptedAt: new Date(),
//       },
//     },
//     { new: true }
//   );

//   if (!ride) {
//     throw new Error("Ride not available or already accepted");
//   }

//   return ride;
// }

export async function acceptRideService({ rideId, driverId }) {
  const ride = await Ride.findOneAndUpdate(
    { _id: rideId, status: "pending" },
    { driver: driverId, status: "accepted", acceptedAt: new Date() },
    { new: true }
  );

  if (!ride) throw new Error("Ride not available or already accepted");

  // Notify passenger and admins
  io.to(ride.passenger.toString()).emit("rideUpdated", ride);
  io.to("admin").emit("rideUpdated", ride);

  return ride;
}