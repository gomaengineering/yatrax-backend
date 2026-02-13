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

// Drop old index if it exists (migration helper - runs once when model is first accessed)
let indexCleanupDone = false;
const cleanupOldIndex = async () => {
  if (indexCleanupDone) return;
  try {
    const indexes = await GuideAvailability.collection.getIndexes();
    if (indexes.guide_1_date_1) {
      console.log('Dropping old index: guide_1_date_1');
      await GuideAvailability.collection.dropIndex('guide_1_date_1');
      console.log('Successfully dropped old index');
    }
    indexCleanupDone = true;
  } catch (err) {
    if (err.code === 27 || err.message?.includes('not found')) {
      // Index doesn't exist, that's fine
      indexCleanupDone = true;
    } else {
      console.error('Error checking/dropping old index:', err.message);
    }
  }
};

// Run cleanup when connection is ready
if (mongoose.connection.readyState === 1) {
  cleanupOldIndex();
} else {
  mongoose.connection.once('connected', cleanupOldIndex);
}

export default GuideAvailability;
