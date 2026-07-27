import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    ride: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", required: true },

    // Who is giving feedback
    givenBy: {
      type: String,
      enum: ["driver", "passenger"],
      required: true,
    },
    givenByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: function () {
        return this.givenBy === "driver" ? "Driver" : "Passenger";
      },
      required: true,
    },

    // Who is receiving the feedback
    givenTo: {
      type: String,
      enum: ["driver", "passenger"],
      required: true,
    },
    givenToUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: function () {
        return this.givenTo === "driver" ? "Driver" : "Passenger";
      },
      required: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Feedback = mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);
