import { createClientsFromEnv, startManualEventConsole } from "./helpers/socket-test.helper.js";

const clients = createClientsFromEnv({
  role: "passenger",
  tokenEnv: "PASSENGER_TOKENS",
  userIdEnv: "PASSENGER_USER_IDS",
  defaultLabel: "passenger",
});

startManualEventConsole(clients, [
  'emit join_ride_chat {"rideId":"RIDE_ID","userId":"PASSENGER_ID","userType":"passenger"}',
  'emit send_message {"rideId":"RIDE_ID","senderId":"PASSENGER_ID","senderType":"passenger","message":"Hello driver"}',
]);
