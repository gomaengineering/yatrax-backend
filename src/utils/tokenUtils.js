// utils/tokenUtils.js
import jwt from "jsonwebtoken";
import crypto from "crypto";

/**
 * Generate short-lived access token for app clients
 * @param {string} userId - MongoDB user _id
 * @param {string} role - User role
 * @returns {string} JWT access token
 */
export const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role, type: "access" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.APP_ACCESS_TOKEN_EXPIRES_IN || "15m" } // Default 15 minutes
  );
};

/**
 * Generate cryptographically secure refresh token
 * @returns {string} Random refresh token string
 */
export const generateRefreshToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Hash refresh token for storage in database
 * @param {string} token - Plain refresh token
 * @returns {string} Hashed token
 */
export const hashRefreshToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Verify refresh token matches stored hash
 * @param {string} hashedToken - Stored hashed token
 * @param {string} plainToken - Plain token from request
 * @returns {boolean} True if tokens match
 */
export const verifyRefreshToken = (hashedToken, plainToken) => {
  const hash = hashRefreshToken(plainToken);
  return hash === hashedToken;
};

/**
 * Get refresh token expiration date
 * @returns {Date} Expiration date
 */
export const getRefreshTokenExpiration = () => {
  const days = parseInt(process.env.APP_REFRESH_TOKEN_EXPIRES_DAYS || "7", 10);
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  return expirationDate;
};

