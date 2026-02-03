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
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TrailInfo",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
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
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    whatsapp: {
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

// Index for trekAreas array
guideSchema.index({ "trekAreas._id": 1 });

// Static method to assign a trail to a guide (syncs both sides)
guideSchema.statics.assignTrailToGuide = async function (guideId, trailInfoId) {
  const Guide = this;
  const TrailInfo = mongoose.model("TrailInfo");

  // Fetch trailInfo to get name
  const trailInfo = await TrailInfo.findById(trailInfoId);
  if (!trailInfo) {
    throw new Error("TrailInfo not found");
  }

  const trailName = trailInfo.name || "Unnamed Trail";

  // Add trailInfo to guide with name
  await Guide.findByIdAndUpdate(guideId, {
    $addToSet: {
      trekAreas: {
        _id: trailInfoId,
        name: trailName,
      },
    },
  });

  // Add guide to trailInfo
  await TrailInfo.findByIdAndUpdate(trailInfoId, {
    $addToSet: { guides: guideId },
  });

  return Guide.findById(guideId);
};

// Static method to assign multiple trails to a guide
guideSchema.statics.assignTrailsToGuide = async function (guideId, trailInfoIds) {
  const Guide = this;
  const TrailInfo = mongoose.model("TrailInfo");

  // Fetch all trailInfos to get names
  const trailInfos = await TrailInfo.find({ _id: { $in: trailInfoIds } });
  if (trailInfos.length !== trailInfoIds.length) {
    throw new Error("Some trail infos not found");
  }

  // Prepare trailInfo data with names
  const trailsData = trailInfos.map((trailInfo) => ({
    _id: trailInfo._id,
    name: trailInfo.name || "Unnamed Trail",
  }));

  // Add trailInfos to guide with names
  await Guide.findByIdAndUpdate(guideId, {
    $addToSet: { trekAreas: { $each: trailsData } },
  });

  // Add guide to all trailInfos
  await TrailInfo.updateMany(
    { _id: { $in: trailInfoIds } },
    { $addToSet: { guides: guideId } }
  );

  return Guide.findById(guideId);
};

// Static method to remove a trail from a guide (syncs both sides)
guideSchema.statics.removeTrailFromGuide = async function (guideId, trailInfoId) {
  const Guide = this;
  const TrailInfo = mongoose.model("TrailInfo");

  // Remove trailInfo from guide (by _id field in embedded document)
  await Guide.findByIdAndUpdate(guideId, {
    $pull: { trekAreas: { _id: trailInfoId } },
  });

  // Remove guide from trailInfo
  await TrailInfo.findByIdAndUpdate(trailInfoId, {
    $pull: { guides: guideId },
  });

  return Guide.findById(guideId);
};

// Static method to remove all trails from a guide
guideSchema.statics.removeAllTrailsFromGuide = async function (guideId) {
  const Guide = this;
  const TrailInfo = mongoose.model("TrailInfo");

  const guide = await Guide.findById(guideId);
  if (!guide || !guide.trekAreas || guide.trekAreas.length === 0) {
    return guide;
  }

  // Extract trailInfo IDs from trekAreas
  const trailInfoIds = guide.trekAreas.map((area) => area._id);

  // Remove guide from all trailInfos
  await TrailInfo.updateMany(
    { _id: { $in: trailInfoIds } },
    { $pull: { guides: guideId } }
  );

  // Clear trails from guide
  guide.trekAreas = [];
  await guide.save();

  return guide;
};

const Guide = mongoose.models.Guide || mongoose.model("Guide", guideSchema);
export default Guide;

