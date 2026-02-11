// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Name is required"],
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
    country:{
      type: String,
      required: false, // Optional for Google OAuth users
      trim: true,
    },
    password: {
      type: String,
      required: function() {
        // Password is only required if authProvider is not 'google'
        return this.authProvider !== 'google';
      },
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // hides password by default
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    role: {
      type: String,
      enum: ["user", "porter", "admin"],
      default: "user",
    },
    subscription: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    profilePicture: {
      type: String,
      trim: true,
    },

  },
  { timestamps: true }
);

// Hash password before saving (only if password exists and is modified)
userSchema.pre("save", async function (next) {
  // Skip password hashing if password is not modified or doesn't exist (OAuth users)
  if (!this.isModified("password") || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  // If user has no password (OAuth user), return false
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;

