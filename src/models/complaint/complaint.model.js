import mongoose from 'mongoose';
import { Schema } from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    raisedBy: {
      type: Schema.Types.ObjectId,
      refPath: 'raisedByUser',
      required: true
    },

    raisedByUser: {
      type: String,
      enum: ['Passenger', 'Driver'],
      required: true
    },
    targetType: {
      type: String,
      enum: ['Passenger', 'Driver', 'System'],
      required: true
    },
    against: {
      type: Schema.Types.ObjectId,
      refPath: 'againstUser'
    },
    againstUser: {
      type: String,
      enum: ['Passenger', 'Driver']
    },
    rideId: {
      type: Schema.Types.ObjectId,
      ref: 'Ride'
    },
    category: {
      type: String,
      enum: [
        'PAYMENT',
        'BEHAVIOR',
        'LATE_PICKUP',
        'WRONG_ROUTE',
        'APP_ISSUE',
        'OTHER'
      ],
      required: true
    },
    description: {
      type: String,
      trim: true,
      minlength: 10,
      maxlength: 1000,
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'PENDING',
      index: true
    },
    adminResponse: {
      type: String,
      trim: true
    },
    resolvedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

export const Complaint = mongoose.model('Complaint', complaintSchema);