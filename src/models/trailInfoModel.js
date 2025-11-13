// models/trailInfoModel.js
import mongoose from "mongoose";

const trailInfoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Trail name is required"],
      trim: true,
    },
    region: {
      type: String,
      required: [true, "Region is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    difficulty: {
      type: String,
      required: [true, "Difficulty is required"],
      trim: true,
    },
    duration_days: {
      type: Number,
      required: [true, "Duration in days is required"],
      min: [1, "Duration must be at least 1 day"],
    },
    total_distance_km: {
      type: Number,
      required: [true, "Total distance is required"],
      min: [0, "Distance must be a positive number"],
    },
    best_season: {
      type: [String],
      required: [true, "Best season is required"],
      default: [],
    },
    major_highlights: {
      type: [String],
      required: [true, "Major highlights are required"],
      default: [],
    },
    starting_point: {
      name: {
        type: String,
        required: [true, "Starting point name is required"],
        trim: true,
      },
      altitude_m: {
        type: Number,
        required: [true, "Starting point altitude is required"],
      },
    },
    ending_point: {
      name: {
        type: String,
        required: [true, "Ending point name is required"],
        trim: true,
      },
      altitude_m: {
        type: Number,
        required: [true, "Ending point altitude is required"],
      },
    },
    altitude_min_m: {
      type: Number,
      required: [true, "Minimum altitude is required"],
    },
    altitude_max_m: {
      type: Number,
      required: [true, "Maximum altitude is required"],
    },
    permit_required: {
      type: [String],
      default: [],
    },
    environment: {
      wildlife: {
        type: [String],
        default: [],
      },
      local_culture: {
        type: String,
        trim: true,
      },
      climate_conditions: {
        type: String,
        trim: true,
      },
      conservation_rules: {
        type: String,
        trim: true,
      },
    },
    user_content: {
      rating_avg: {
        type: Number,
        default: 0,
        min: [0, "Rating must be at least 0"],
        max: [5, "Rating must be at most 5"],
      },
      rating_count: {
        type: Number,
        default: 0,
        min: [0, "Rating count must be at least 0"],
      },
    },
  },
  { timestamps: true }
);

// Indexes for common queries
trailInfoSchema.index({ name: 1 });
trailInfoSchema.index({ region: 1 });
trailInfoSchema.index({ country: 1 });
trailInfoSchema.index({ difficulty: 1 });
trailInfoSchema.index({ "user_content.rating_avg": -1 });

const TrailInfo = mongoose.model("TrailInfo", trailInfoSchema);
export default TrailInfo;

