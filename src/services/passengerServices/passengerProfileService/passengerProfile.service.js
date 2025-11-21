import { passengerfields } from "../../../common/utlis.js";
import { normalizeNumber } from "../../../helpers/helper.js";
import { Passenger } from "../../../models/passengers/passenger.model.js";


// -------------------- Update Profile --------------------
export async function updateProfile(passenger, data = {}) {
  passengerfields.forEach((field) => {
    if (data[field] !== undefined) {
      passenger[field] =
        field === "contactNumber" ? normalizeNumber(data[field]) : data[field];
    }
  });

  if (data.documents && typeof data.documents === "object") {
    passenger.documents = { ...passenger.documents, ...data.documents };
  }

  passenger.profileCompleted = Boolean(passenger.name || passenger.email || passenger.gender);  

  await passenger.save(); 

  const result = passenger.toObject ? passenger.toObject() : passenger;
  delete result.__v;

  return { passenger: result };
}  



// -------------------- Logout --------------------
export async function logout(passengerId) {
  await Passenger.findByIdAndUpdate(passengerId, { lastLogoutAt: new Date() });
  return { message: "Logged out successfully" };
}
