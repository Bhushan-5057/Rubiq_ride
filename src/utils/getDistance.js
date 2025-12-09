import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

//--------------------- Get Distance ---------------------
export async function getRealDistance(pickup, drop) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  const response = await axios.get(
    "https://maps.googleapis.com/maps/api/distancematrix/json",
    {
      params: {
        origins: `${pickup.lat},${pickup.lng}`,
        destinations: `${drop.lat},${drop.lng}`,
        mode: "driving",
        key: apiKey,
      },
    }
  );
  const element = response.data.rows[0].elements[0];

if (!element || element.status !== "OK") {
  throw new Error(`Distance API error: ${element?.status || "No data returned"}`);
}
  return {
    distanceKm: element.distance.value / 1000,
    durationMin: element.duration.value / 60,
  };
}