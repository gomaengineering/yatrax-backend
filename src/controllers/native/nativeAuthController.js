// controllers/native/nativeAuthController.js
import User from "../../models/userModel.js";
import RefreshToken from "../../models/refreshTokenModel.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiration,
} from "../../utils/tokenUtils.js";

/**
 * Login user and generate access + refresh tokens
 * POST /api/native/auth/login
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Find user by email (include password field)
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = hashRefreshToken(refreshToken);
    const expiresAt = getRefreshTokenExpiration();

    // Get device info from request (optional)
    const deviceId = req.body.deviceId || null;
    const deviceInfo = req.body.deviceInfo || null;
    const ipAddress = req.ip || req.connection.remoteAddress || null;

    // Revoke all existing refresh tokens for this user (single active session)
    // Or comment this out to allow multiple sessions
    await RefreshToken.updateMany(
      { userId: user._id, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() }
    );

    // Store refresh token in database
    await RefreshToken.create({
      userId: user._id,
      token: hashedRefreshToken,
      expiresAt,
      deviceId,
      deviceInfo,
      ipAddress,
    });

    // Return tokens and user data
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          country: user.country,
          role: user.role,
          subscription: user.subscription,
        },
      },
    });
  } catch (error) {
    console.error("App login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * Refresh access token using refresh token
 * POST /api/native/auth/refresh
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: providedRefreshToken } = req.body;

    // Validate refresh token
    if (!providedRefreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Hash the provided token to find it in database
    const hashedToken = hashRefreshToken(providedRefreshToken);

    // Find refresh token in database
    const storedToken = await RefreshToken.findOne({
      token: hashedToken,
      isRevoked: false,
    }).populate("userId");

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid or revoked refresh token",
      });
    }

    // Check if token is expired
    if (storedToken.isExpired()) {
      // Mark as revoked
      storedToken.isRevoked = true;
      storedToken.revokedAt = new Date();
      await storedToken.save();

      return res.status(401).json({
        success: false,
        message: "Refresh token has expired",
      });
    }

    // Verify user still exists and is active
    const user = storedToken.userId;
    if (!user) {
      // Revoke token if user doesn't exist
      storedToken.isRevoked = true;
      storedToken.revokedAt = new Date();
      await storedToken.save();

      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id, user.role);

    // Token rotation: Generate new refresh token and revoke old one
    const newRefreshToken = generateRefreshToken();
    const newHashedRefreshToken = hashRefreshToken(newRefreshToken);
    const newExpiresAt = getRefreshTokenExpiration();

    // Revoke old refresh token
    storedToken.isRevoked = true;
    storedToken.revokedAt = new Date();
    await storedToken.save();

    // Get device info from request
    const deviceId = req.body.deviceId || storedToken.deviceId;
    const deviceInfo = req.body.deviceInfo || storedToken.deviceInfo;
    const ipAddress = req.ip || req.connection.remoteAddress || storedToken.ipAddress;

    // Create new refresh token
    await RefreshToken.create({
      userId: user._id,
      token: newHashedRefreshToken,
      expiresAt: newExpiresAt,
      deviceId,
      deviceInfo,
      ipAddress,
    });

    // Return new tokens
    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * Logout user and revoke refresh token(s)
 * POST /api/native/auth/logout
 * Can work with:
 *   - Refresh token in body (logout specific device, no auth required)
 *   - Access token in header (logout all devices, requires auth via protect middleware)
 */
export const logout = async (req, res) => {
  try {
    // Get refresh token from request body (optional - can logout specific device)
    const { refreshToken: providedRefreshToken } = req.body;

    // If refresh token provided, revoke only that token (no auth required)
    if (providedRefreshToken) {
      const hashedToken = hashRefreshToken(providedRefreshToken);
      const storedToken = await RefreshToken.findOne({
        token: hashedToken,
        isRevoked: false,
      });

      if (storedToken) {
        storedToken.isRevoked = true;
        storedToken.revokedAt = new Date();
        await storedToken.save();
      }

      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    }

    // If no refresh token provided, check if user is authenticated via access token
    // This requires the protect middleware to be called before this controller
    // Try to extract user from request (set by protect middleware)
    if (req.user && req.userId) {
      await RefreshToken.updateMany(
        { userId: req.userId, isRevoked: false },
        { isRevoked: true, revokedAt: new Date() }
      );

      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    }

    // If neither refresh token nor access token provided
    return res.status(400).json({
      success: false,
      message: "Refresh token in body or valid access token in header is required",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

