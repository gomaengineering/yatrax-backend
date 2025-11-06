import jwt from "jsonwebtoken";

/*
 * Generates a JWT token for a user
 * @param {string} userId - MongoDB user _id
 * @param {string} role - User role (user/porter/admin)
 * @returns {string} JWT token
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,      // Make sure JWT_SECRET is in your .env
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } // Default 7 days
  );
};

export default generateToken;
