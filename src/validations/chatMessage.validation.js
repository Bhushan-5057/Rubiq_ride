import { Ride } from "../models/ride/ride.model.js";

export const validatedRideChatAccess = async ({ rideId, userId, userType }) => {
    const ride = await Ride.findById(rideId).select("passenger driver status");
    if (!ride) throw new Error("Ride not Found")

    if (userType === "passenger" && ride.passenger.toString() !== userId)
        throw new Error("Unauthorized Passenger");

    if (userType === "driver" && ride.driver?.toString() !== userId)
        throw new Error("Unauthorized Driver");

    if (["completed", "cancelled", "missed"].includes(ride.status))
        throw new Error("Chat not allowed for this ride");

    return ride

}
