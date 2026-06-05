import { Passenger } from "../models/passenger/passenger.model.js";

export const passengerRepository = {
  findById(passengerId) {
    return Passenger.findById(passengerId);
  },

  findActiveById(passengerId) {
    return Passenger.findOne({ _id: passengerId, isActive: true });
  },

  findByContactNumber(contactNumber) {
    return Passenger.findOne({ contactNumber });
  },

  findByEmail(email) {
    return Passenger.findOne({ email });
  },

  create(payload) {
    return Passenger.create(payload);
  },

  count(query) {
    return Passenger.countDocuments(query);
  },

  findAll(query, { sort, skip, limit }) {
    return Passenger.find(query).sort(sort).skip(skip).limit(parseInt(limit));
  },
};
