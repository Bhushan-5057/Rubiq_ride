import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const roles = ['admin'];
const genders = ['male', 'female', 'other'];

const AdminSchema = new mongoose.Schema(
  {
    contactNumber: { 
      type: String, 
      required: false, 
      unique: true, 
      sparse: true,
      trim: true,
      index: true 
    },
    email: { 
      type: String, 
      lowercase: true, 
      trim: true, 
      sparse: true 
    },
    password: { 
      type: String, 
      required: function() { return this.role === 'admin'; }, 
      select: false 
    },
    name: { type: String, trim: true },
    gender: { type: String, enum: genders },
    role: { 
      type: String, 
      enum: roles, 
      default: 'admin',
    },
  },
  { timestamps: true }
);

// 🔐 Hash password before save
AdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (!this.password) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔍 Password comparison method
AdminSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

export const Admin = mongoose.model('Admin', AdminSchema);
export const ADMIN_ROLES = roles;
