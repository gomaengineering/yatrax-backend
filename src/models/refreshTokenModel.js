// models/refreshTokenModel.js
import mongoose from "mongoose";
import crypto from "crypto";

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index for automatic deletion
    },
    deviceId: {
      type: String,
      default: null,
    },
    deviceInfo: {
      type: {
        platform: String,
        model: String,
        osVersion: String,
      },
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
refreshTokenSchema.index({ userId: 1, isRevoked: 1 });
refreshTokenSchema.index({ token: 1, isRevoked: 1 });

// Static method to hash token
refreshTokenSchema.statics.hashToken = function (token) {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// Static method to verify token
refreshTokenSchema.statics.verifyToken = function (hashedToken, plainToken) {
  const hash = this.hashToken(plainToken);
  return hash === hashedToken;
};

// Method to check if token is expired
refreshTokenSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

// Method to check if token is valid (not revoked and not expired)
refreshTokenSchema.methods.isValid = function () {
  return !this.isRevoked && !this.isExpired();
};

const RefreshToken =
  mongoose.models.RefreshToken || mongoose.model("RefreshToken", refreshTokenSchema);

export default RefreshToken;

