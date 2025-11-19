
import { Passenger } from "../../../models/passengers/passenger.model.js";
import { verifyOtp } from "../../../services/otpService/otp.service.js";
import { normalizeNumber, signToken } from "../../../helpers/helper.js";



// -------------------- Register Passenger --------------------
export async function registerPassenger({ name, email, password, contactNumber, gender }) {
  const query = [{ email }];
  if (contactNumber) query.push({ contactNumber });

  const existing = await Passenger.findOne({ $or: query });
  if (existing) {
    if (existing.email === email) throw new Error("Passenger with this email already exists");
    if (contactNumber && existing.contactNumber === contactNumber)
      throw new Error("Passenger with this contact number already exists");
  }

  const newPassenger = new Passenger({ name, email, password, contactNumber, gender });
  await newPassenger.save();

  return newPassenger;
}

// -------------------- OTP Login --------------------
export async function otpLogin({ contactNumber, otp, name, email, gender }) {
  contactNumber = normalizeNumber(contactNumber);

  const isValidOtp = await verifyOtp(contactNumber, otp ,"passenger");
  if (!isValidOtp) throw new Error("Invalid or expired OTP");

  let passenger = await Passenger.findOne({ contactNumber });

  if (!passenger) {
    passenger = await Passenger.create({
      contactNumber,
      otpVerified: true,
      name: name || "",
      email: email || null,
      gender: gender || "",
      status: "active",
      profileCompleted: false,
    });
  } else {
    passenger.otpVerified = true;

    if (name && !passenger.name) passenger.name = name;
    if (email && !passenger.email) passenger.email = email;
    if (gender && !passenger.gender) passenger.gender = gender;

    await passenger.save();
  }

  const profileCompleted = Boolean(passenger.name && passenger.email && passenger.gender);
  if (profileCompleted !== passenger.profileCompleted) {
    passenger.profileCompleted = profileCompleted;
    await passenger.save();
  }

  const token = signToken(passenger);
  return { passenger: passenger, token, profileCompleted };
}
