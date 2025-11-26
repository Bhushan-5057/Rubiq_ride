import { Driver } from "../../../models/driver/driver.model.js";

export async function getDriverEarnings(driverId) {
    const driver = await Driver.findById(driverId)
        .select("name vehicleNumber vehicleType contactNumber earnings rideCount");
    if (!driver) {
        const error = new Error("Driver not found");
        error.status = 404;
        throw error;
    }

    const driverObj = driver.toObject();

    const totalEarnings = driverObj.earnings?.totalEarnings || 0;
    const totalDriverPayout = driverObj.earnings?.totalDriverPayout || 0;
    const totalPlatformFee = driverObj.earnings?.totalPlatformFee || 0;
    const totalRides = driverObj.rideCount?.completed || 0;

    return ({
        totalEarnings,
        totalDriverPayout,
        totalPlatformFee,
        totalRides,
        driver
    });
}