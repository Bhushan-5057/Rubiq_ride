import { createClientsFromEnv, startManualEventConsole } from "./helpers/socket-test.helper.js";

const clients = createClientsFromEnv({
  role: "driver",
  tokenEnv: "DRIVER_TOKENS",
  userIdEnv: "DRIVER_USER_IDS",
  defaultLabel: "driver",
});

startManualEventConsole(clients, [
  'emit join_ride_chat {"rideId":"RIDE_ID","userId":"DRIVER_ID","userType":"driver"}',
  'emit send_message {"rideId":"RIDE_ID","senderId":"DRIVER_ID","senderType":"driver","message":"I am on the way"}',
]);
