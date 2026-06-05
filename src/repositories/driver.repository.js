import { Driver } from "../models/driver/driver.model.js";

export const driverRepository = {
  findById(driverId) {
    return Driver.findById(driverId);
  },

  findActiveById(driverId) {
    return Driver.findOne({ _id: driverId, isActive: true });
  },

  findByContactNumber(contactNumber) {
    return Driver.findOne({ contactNumber });
  },

  findByEmail(email) {
    return Driver.findOne({ email });
  },

  create(payload) {
    return Driver.create(payload);
  },

  count(query) {
    return Driver.countDocuments(query);
  },

  findAll(query, { sort, skip, limit }) {
    return Driver.find(query).sort(sort).skip(skip).limit(parseInt(limit));
  },
};
