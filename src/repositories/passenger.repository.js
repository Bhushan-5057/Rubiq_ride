import { Passenger } from "../models/passenger/passenger.model.js";
import { passengerActiveQuery } from "../helpers/passengerStatus.helper.js";

export const passengerRepository = {
  findById(passengerId) {
    return Passenger.findById(passengerId);
  },

  findActiveById(passengerId) {
    return Passenger.findOne(passengerActiveQuery({ _id: passengerId }));
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
