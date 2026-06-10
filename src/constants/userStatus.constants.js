export const ADMIN_ROLES = Object.freeze({
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
});

export const USER_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  BLOCKED: "blocked",
  PENDING: "pending",
});

export const DRIVER_APPROVAL_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  INCOMPLETED: "incompleted",
});

export const DRIVER_AVAILABILITY_STATUS = Object.freeze({
  AVAILABLE: "available",
  UNAVAILABLE: "unavailable",
  ON_TRIP: "on_trip",
});

export const ACTIVE_USER_FILTER = Object.freeze({ isActive: true });

export const ROLE_PERMISSIONS = Object.freeze({
  MANAGE_ADMINS: [ADMIN_ROLES.SUPER_ADMIN],
  MANAGE_DRIVERS: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN],
  MANAGE_PASSENGERS: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN],
  MANAGE_RIDES: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN],
  READ_ADMIN_PROFILE: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN],
});

export function getStatusUpdateMessage(entityName, isActive) {
  return `${entityName} ${isActive ? "restored" : "deactivated"} successfully`;
}
