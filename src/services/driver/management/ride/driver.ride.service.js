export async function updateDriverLocationService(driver, lat, lng) {

  if (!driver?._id) {
    throw new Error("Driver not found or unauthorized");
  }

  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("Latitude and longitude must be valid numbers");
  }

  driver.latitude = lat;
  driver.longitude = lng;

  await driver.save();

  return {
    id: driver._id,
    name: driver.name,
    vehicleType: driver.vehicleType,
    vehicleNumber: driver.vehicleNumber,
    coordinates: driver.location?.coordinates ,
    updatedAt: driver.updatedAt,
  };
}