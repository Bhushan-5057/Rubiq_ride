import { passengerfields } from "../../../common/utlis.js";
import { normalizeNumber } from "../../../helpers/helper.js";
import { Passenger } from "../../../models/passenger/passenger.model.js";
import { sendEmail, renderTemplate } from "../../../utils/mailer.js";

// -------------------- Update Profile --------------------
export async function updateProfile(passenger, data = {}) {
  if (!passenger) throw new Error("Passenger not found");

  const wasProfileCompleted = passenger.profileCompleted;
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

    const forceEmail = data.forceEmail === true;
  
  // true only when profile transitions from false → true
  const profileJustCompleted =
    !wasProfileCompleted && passenger.profileCompleted === true;
  
  // Decide if email is allowed to send
  const shouldSendEmail =
    passenger.email &&
    (
      // normal production flow
      (profileJustCompleted && !passenger.welcomeEmailSent) ||
      // testing flow
      forceEmail
    );
  
  console.log({
    wasProfileCompleted,
    profileCompleted: passenger.profileCompleted,
    profileJustCompleted,
    welcomeEmailSent: passenger.welcomeEmailSent,
    forceEmail,
  });
  
  if (shouldSendEmail) {
    try {
      const html = renderTemplate("passenger.welcome.html", {
        name: passenger.name || "Captain",
        year: new Date().getFullYear(),
      });
  
      await sendEmail({
        to: passenger.email,
        subject: "Welcome to Rubiq Ride – Let’s Get Moving 🚕",
        html,
      });
  
      // Only mark sent in real flow
      if (!forceEmail) {
        passenger.welcomeEmailSent = true;
      }
    } catch (err) {
      console.error("Welcome email failed:", err.message);
    }
  }

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
