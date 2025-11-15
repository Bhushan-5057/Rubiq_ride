import { getDistance } from "geolib";
import { Driver } from "../../../../models/driver/Driver.model.js";
import { Ride } from "../../../../models/ride/ride.model.js";

export async function createRideService({ passengerId, pickup, drop }) {
const distanceInKm = getDistance(
{ latitude: pickup.lat, longitude: pickup.lng },
{ latitude: drop.lat, longitude: drop.lng }
) / 1000;


const fareEstimate = Math.round(50 + distanceInKm * 10);


const ride = await Ride.create({
passenger: passengerId,
pickup: { address: pickup.address, coordinates: [pickup.lng, pickup.lat] },
drop: { address: drop.address, coordinates: [drop.lng, drop.lat] },
distance: distanceInKm,
fareEstimate,
});


const nearbyDrivers = await Driver.find({
status: "active",
location: {
$near: {
$geometry: { type: "Point", coordinates: [pickup.lng, pickup.lat] },
$maxDistance: 5000,
},
},
});


return { ride, nearbyDrivers };
}