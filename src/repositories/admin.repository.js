import { Admin } from "../models/admin/admin.model.js";
import { ADMIN_ROLES } from "../constants/userStatus.constants.js";

export const adminRepository = {
  findByEmail(email, options = {}) {
    const query = Admin.findOne({ email });
    if (options.withPassword) query.select("+password");
    return query;
  },

  findActiveById(adminId) {
    return Admin.findOne({ _id: adminId, isActive: true }).select("-password");
  },

findById(adminId, options = {}) {
  const query = Admin.findById(adminId);

  if (options.withPassword) {
    query.select("+password");
  } else {
    query.select("-password");
  }

  return query;
},

  existsSuperAdmin(excludeAdminId) {
    const query = { role: ADMIN_ROLES.SUPER_ADMIN };
    if (excludeAdminId) query._id = { $ne: excludeAdminId };
    return Admin.exists(query);
  },

  create(payload) {
    return Admin.create(payload);
  },

  findAll(query, { skip, limit, sort }) {
    return Admin.find(query)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort(sort);
  },

  count(query) {
    return Admin.countDocuments(query);
  },

  updateById(adminId, updateData) {
    return Admin.findOneAndUpdate(
      { _id: adminId, isActive: true },
      updateData,
      { new: true, runValidators: true }
    ).select("-password");
  },
};
