// models/guideModel.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const guideSchema = new mongoose.Schema(
  {
    FirstName: {
      type: String,
      required: [true, "First Name is required"],
      trim: true,
    },
    LastName: {
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
    Description: {
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
    TrekAreas: {
      type: [String], // Array of trekking areas
      required: true,
      default: [],
    },
    Experience: {
      type: Number,
      required: true,
      trim: true,
    },
    Education: {
      type: String,
      required: true,
      trim: true,
    },
    Languages: {
      type: [String], // Array of languages spoken
      required: true,
      default: [],
    },
    RatePerDay: {
      type: Number,
      required: true,
      min: [0, "Rate per day must be a positive number"],
    },
    Certifications: {
      type: [String], // Array of certifications
      required: true,
      default: [],
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

const Guide = mongoose.model("Guide", guideSchema);
export default Guide;
