import mongoose from "mongoose";

const bankAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'userType',
      index: true,
    },
    userType: {
      type: String,
      enum: ["driver", "passenger"],
      required: true,
      index: true,
    },
    accountHolderName: {
      type: String,
      required: true,
      trim: true
    },
    bankName: {
      type: String,
      required: true,
      trim: true
    },
    accountNumber: {
      type: String,
      required: true,
      index: true
    },
    ifscCode: {
      type: String,
      required: true,
      uppercase: true
    },
    branchName: {
      type: String,
      required: true,
      trim: true
    },
    isVerified: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true
    },
    verificationRemarks: {
      type: String,
      trim: true
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index to ensure one bank account per user
bankAccountSchema.index({ userId: 1, userType: 1 }, { unique: true });

// Pre-save hook to ensure verificationRemarks is only set when isVerified is 'rejected'
bankAccountSchema.pre('save', function(next) {
  if (this.isVerified !== 'rejected') {
    this.verificationRemarks = undefined;
  }
  next();
});

export const BankAccount =
  mongoose.models.BankAccount ||
  mongoose.model("BankAccount", bankAccountSchema);
