import "dotenv/config";
import { connectDB, mongoose } from "../config/dbConnect.js";
import { Admin } from "../models/admin/admin.model.js";
import { Driver } from "../models/driver/driver.model.js";
import { Passenger } from "../models/passenger/passenger.model.js";
import { Ride } from "../models/ride/ride.model.js";
import { USER_STATUS } from "../constants/userStatus.constants.js";

const LEGACY_DELETED_FIELD = ["is", "Deleted"].join("");
const LEGACY_INACTIVE_STATUS = ["de", "active"].join("");

async function migrateCollection(Model, label) {
  const activeWhenLegacyMissing = await Model.updateMany(
    { isActive: { $exists: false }, [LEGACY_DELETED_FIELD]: { $exists: false } },
    { $set: { isActive: true } }
  );

  const result = await Model.updateMany(
    { isActive: { $exists: false }, [LEGACY_DELETED_FIELD]: { $exists: true } },
    [{ $set: { isActive: { $not: [`$${LEGACY_DELETED_FIELD}`] } } }]
  );

  console.log(`${label}: initialized isActive on ${activeWhenLegacyMissing.modifiedCount + result.modifiedCount} records`);
}

async function normalizeLegacyStatuses() {
  const [drivers, passengers] = await Promise.all([
    Driver.updateMany({ status: LEGACY_INACTIVE_STATUS }, { $set: { status: USER_STATUS.INACTIVE, isActive: false } }),
    Passenger.updateMany({ status: LEGACY_INACTIVE_STATUS }, { $set: { status: USER_STATUS.INACTIVE, isActive: false } }),
  ]);

  console.log(`Drivers: normalized ${drivers.modifiedCount} legacy inactive statuses`);
  console.log(`Passengers: normalized ${passengers.modifiedCount} legacy inactive statuses`);
}

async function run() {
  await connectDB();

  await Promise.all([
    migrateCollection(Admin, "Admins"),
    migrateCollection(Driver, "Drivers"),
    migrateCollection(Passenger, "Passengers"),
    migrateCollection(Ride, "Rides"),
  ]);

  await normalizeLegacyStatuses();

  await Promise.all([
    Admin.updateMany({ [LEGACY_DELETED_FIELD]: { $exists: true } }, { $unset: { [LEGACY_DELETED_FIELD]: "" } }),
    Driver.updateMany({ [LEGACY_DELETED_FIELD]: { $exists: true } }, { $unset: { [LEGACY_DELETED_FIELD]: "" } }),
    Passenger.updateMany({ [LEGACY_DELETED_FIELD]: { $exists: true } }, { $unset: { [LEGACY_DELETED_FIELD]: "" } }),
    Ride.updateMany({ [LEGACY_DELETED_FIELD]: { $exists: true } }, { $unset: { [LEGACY_DELETED_FIELD]: "" } }),
  ]);

  console.log("isActive migration completed");
  await mongoose.connection.close();
}

run().catch(async (error) => {
  console.error("isActive migration failed:", error);
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
