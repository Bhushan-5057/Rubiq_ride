import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ADMIN_ROLES } from '../../constants/userStatus.constants.js';

const adminRoles = Object.values(ADMIN_ROLES);

const AdminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    name: { type: String, trim: true },
    role: {
      type: String,
      enum: adminRoles,
      default: ADMIN_ROLES.ADMIN
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

AdminSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: ADMIN_ROLES.SUPER_ADMIN },
    name: 'unique_super_admin_role'
  }
);

AdminSchema.pre('validate', async function (next) {
  if (this.role !== ADMIN_ROLES.SUPER_ADMIN) return next();
  if (!this.isNew && !this.isModified('role')) return next();

  const existingSuperAdmin = await this.constructor.exists({
    _id: { $ne: this._id },
    role: ADMIN_ROLES.SUPER_ADMIN
  });

  if (existingSuperAdmin) {
    const error = new Error('Only one super admin can exist');
    error.status = 409;
    return next(error);
  }

  next();
});

AdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (!this.password) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

AdminSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

export const Admin = mongoose.model('Admin', AdminSchema);
