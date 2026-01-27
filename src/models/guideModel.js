// models/guideModel.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const guideSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First Name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // hides password by default
    },
    role: {
      type: String,
      enum: ["guide", "admin"],
      default: "guide",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    TBNumber: {
      type: String,
      required: true, // Trekking Board Number
      trim: true,
      unique: true, // Multiple guides might not have TB Number
    },
    trekAreas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trail",
      },
    ],
    experience: {
      type: Number,
      required: true,
      trim: true,
    },
    education: {
      type: String,
      required: true,
      trim: true,
    },
    languages: {
      type: [String], // Array of languages spoken
      required: true,
      default: [],
    },
    ratePerDay: {
      type: Number,
      required: true,
      min: [0, "Rate per day must be a positive number"],
    },
    certifications: {
      type: [String], // Array of certifications
      required: true,
      default: [],
    },
    photo: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before saving
guideSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare entered password with hashed password
guideSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Index for trails array
guideSchema.index({ trails: 1 });

// Static method to assign a trail to a guide (syncs both sides)
guideSchema.statics.assignTrailToGuide = async function (guideId, trailId) {
  const Guide = this;
  const Trail = mongoose.model("Trail");

  // Add trail to guide
  await Guide.findByIdAndUpdate(guideId, {
    $addToSet: { trails: trailId },
  });

  // Add guide to trail
  await Trail.findByIdAndUpdate(trailId, {
    $addToSet: { guides: guideId },
  });

  return Guide.findById(guideId).populate("trails");
};

// Static method to assign multiple trails to a guide
guideSchema.statics.assignTrailsToGuide = async function (guideId, trailIds) {
  const Guide = this;
  const Trail = mongoose.model("Trail");

  // Add trails to guide
  await Guide.findByIdAndUpdate(guideId, {
    $addToSet: { trails: { $each: trailIds } },
  });

  // Add guide to all trails
  await Trail.updateMany(
    { _id: { $in: trailIds } },
    { $addToSet: { guides: guideId } }
  );

  return Guide.findById(guideId).populate("trails");
};

// Static method to remove a trail from a guide (syncs both sides)
guideSchema.statics.removeTrailFromGuide = async function (guideId, trailId) {
  const Guide = this;
  const Trail = mongoose.model("Trail");

  // Remove trail from guide
  await Guide.findByIdAndUpdate(guideId, {
    $pull: { trails: trailId },
  });

  // Remove guide from trail
  await Trail.findByIdAndUpdate(trailId, {
    $pull: { guides: guideId },
  });

  return Guide.findById(guideId).populate("trails");
};

// Static method to remove all trails from a guide
guideSchema.statics.removeAllTrailsFromGuide = async function (guideId) {
  const Guide = this;
  const Trail = mongoose.model("Trail");

  const guide = await Guide.findById(guideId);
  if (!guide || !guide.trails || guide.trails.length === 0) {
    return guide;
  }

  // Remove guide from all trails
  await Trail.updateMany(
    { _id: { $in: guide.trails } },
    { $pull: { guides: guideId } }
  );

  // Clear trails from guide
  guide.trails = [];
  await guide.save();

  return guide;
};

const Guide = mongoose.models.Guide || mongoose.model("Guide", guideSchema);
export default Guide;

