// models/guideAvailabilityModel.js
import mongoose from "mongoose";

const guideAvailabilitySchema = new mongoose.Schema(
  {
    guide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guide",
      required: [true, "Guide is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
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

// Normalize startDate/endDate to start of day UTC before saving
guideAvailabilitySchema.pre("save", function (next) {
  const norm = (d) =>
    d
      ? new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
        )
      : d;
  if (this.isModified("startDate") && this.startDate) {
    this.startDate = norm(new Date(this.startDate));
  }
  if (this.isModified("endDate") && this.endDate) {
    this.endDate = norm(new Date(this.endDate));
  }
  next();
});

// One document per guide per date range (same range = update, not duplicate)
guideAvailabilitySchema.index(
  { guide: 1, startDate: 1, endDate: 1 },
  { unique: true }
);

const GuideAvailability =
  mongoose.models.GuideAvailability ||
  mongoose.model("GuideAvailability", guideAvailabilitySchema);

export default GuideAvailability;
