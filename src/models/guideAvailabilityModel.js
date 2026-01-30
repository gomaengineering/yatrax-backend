// models/guideAvailabilityModel.js
import mongoose from "mongoose";

const guideAvailabilitySchema = new mongoose.Schema(
  {
    guide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guide",
      required: [true, "Guide is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    status: {
      type: String,
      enum: ["available", "not available"],
      default: "available",
    },
    note: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

// Normalize date to start of day (UTC) before saving
guideAvailabilitySchema.pre("save", function (next) {
  if (this.isModified("date") && this.date) {
    const d = new Date(this.date);
    this.date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  next();
});

// Compound unique index: one entry per guide per day
guideAvailabilitySchema.index({ guide: 1, date: 1 }, { unique: true });

// Index for range queries (e.g. "availability for guide X from Feb 1 to Feb 28")
guideAvailabilitySchema.index({ guide: 1, date: 1 });

const GuideAvailability =
  mongoose.models.GuideAvailability ||
  mongoose.model("GuideAvailability", guideAvailabilitySchema);

export default GuideAvailability;
