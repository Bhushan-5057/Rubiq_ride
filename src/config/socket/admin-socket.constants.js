export const ADMIN_SOCKET_ROOMS = Object.freeze({
  GLOBAL: "admin:global",
  SUPER_ADMIN: "admin:super_admin",
  NOTIFICATIONS: "admin:notifications",
  DASHBOARD: "admin:dashboard",
});

export const ADMIN_SOCKET_EVENTS = Object.freeze({
  REGISTERED: "admin:registered",
  JOIN_DASHBOARD: "admin:join_dashboard",
  LEAVE_DASHBOARD: "admin:leave_dashboard",
  BROADCAST_NOTIFICATION: "admin:broadcast_notification",
  REQUEST_DASHBOARD_STATS: "admin:request_dashboard_stats",
  SOS_ALERT: "sos:alert",
});
