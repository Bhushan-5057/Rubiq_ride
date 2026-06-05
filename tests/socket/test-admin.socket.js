import { createClientsFromEnv, startManualEventConsole } from "./helpers/socket-test.helper.js";

const clients = createClientsFromEnv({
  role: "admin",
  tokenEnv: "ADMIN_TOKENS",
  userIdEnv: "ADMIN_USER_IDS",
  defaultLabel: "admin",
});

startManualEventConsole(clients, [
  'emit admin:join_dashboard {}',
  'emit admin:broadcast_notification {"title":"Ops notice","message":"Testing admin realtime"}',
]);
