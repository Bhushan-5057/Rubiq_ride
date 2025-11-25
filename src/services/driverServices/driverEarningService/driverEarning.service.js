import { Ride, Driver } from "../../../models/index.js"

export async function getDriverEarnings(driverId, startDate, endDate) {
    const driver = await Driver.findById(driverId)
        .select("name vehicleNumber vehicleType contactNumber");
    if (!driver) {
        const error = new Error("Driver not found");
        error.status = 404;
        throw error;
    }
    const rides = await Ride.find({
        driver: driverId,
        status: "completed",
        createdAt: { $gte: startDate, $lte: endDate }
    });

    const trips = rides.length;
    const totalEarnings = rides.reduce((total, ride) => total + (ride.fareEstimate || 0), 0);
    return ({
        totalEarnings,
        totalRides: rides.length,
        driver
    });
}