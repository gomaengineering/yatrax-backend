// models/featuredTrailModel.js
import mongoose from "mongoose";

const featuredTrailSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Trail name is required"],
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    time: {
      type: String,
      required: [true, "Time is required"],
      trim: true,
    },
    activityType: {
      type: String,
      required: [true, "Activity type is required"],
      enum: ["Hike", "Trekking", "City Tour"],
      trim: true,
    },
    difficulty: {
      type: String,
      required: [true, "Difficulty is required"],
      enum: ["Easy", "Moderate", "Hard", "Extreme"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Image URL is required"],
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes for common queries
featuredTrailSchema.index({ id: 1 });
featuredTrailSchema.index({ name: 1 });
featuredTrailSchema.index({ activityType: 1 });
featuredTrailSchema.index({ difficulty: 1 });
featuredTrailSchema.index({ location: 1 });

const FeaturedTrail = mongoose.model("FeaturedTrail", featuredTrailSchema);
export default FeaturedTrail;

