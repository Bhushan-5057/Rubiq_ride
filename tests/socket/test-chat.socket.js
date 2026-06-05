import { createClientsFromEnv, startManualEventConsole } from "./helpers/socket-test.helper.js";

const clients = createClientsFromEnv({
  role: "chat",
  tokenEnv: "CHAT_TOKENS",
  userIdEnv: "CHAT_USER_IDS",
  defaultLabel: "chat",
});

startManualEventConsole(clients, [
  'to chat-1 join_ride_chat {"rideId":"RIDE_ID","userId":"PASSENGER_ID","userType":"passenger"}',
  'to chat-2 join_ride_chat {"rideId":"RIDE_ID","userId":"DRIVER_ID","userType":"driver"}',
  'to chat-1 send_message {"rideId":"RIDE_ID","senderId":"PASSENGER_ID","senderType":"passenger","message":"Hello"}',
]);
