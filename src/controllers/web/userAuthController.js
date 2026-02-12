import crypto from "crypto";
import User from "../../models/userModel.js";
import generateToken from "../../utils/generateToken.js";
import { oauth2Client } from "../../utils/googleConfig.js";
import { sendPasswordResetEmail } from "../../utils/resend.js";

// 🔑 GET GOOGLE CLIENT ID (Public endpoint for frontend)
export const getGoogleClientId = async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      return res.status(500).json({
        success: false,
        message: "Google Client ID is not configured on the server",
      });
    }

    res.status(200).json({
      success: true,
      clientId: clientId,
    });
  } catch (error) {
    console.error("Get Google Client ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// 🧩 REGISTER USER
export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, country, role, subscription } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "firstName, lastName, email, and password are required" 
      });
    }

    // Check if user already exists by email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    // Create user with local authentication
    const newUser = await User.create({ 
      firstName, 
      lastName, 
      email: email.toLowerCase(), 
      password, 
      country,
      authProvider: "local", // Explicitly set for email/password registration
      role: role || "user",
      subscription: subscription || "free"
    });

    // Generate JWT token using the utility function
    const token = generateToken(newUser._id, newUser.role);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        country: newUser.country,
        role: newUser.role,
        subscription: newUser.subscription,
        profilePicture: newUser.profilePicture,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

//  LOGIN USER (Email only)
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
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

    // Find user by email only
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Check if user is OAuth-only (no password set)
    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({ 
        success: false, 
        message: "This account was created with Google. Please use Google Sign-In to login." 
      });
    }

    // Compare passwords
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token using the utility function
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        country: user.country,
        role: user.role,
        subscription: user.subscription,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🔐 GOOGLE LOGIN (accepts idToken or code+redirect_uri for OAuth2 popup flow; avoids FedCM)
export const googleLogin = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ 
        success: false, 
        message: "Request body is missing. Make sure to send JSON data." 
      });
    }

    const { idToken: idTokenFromBody, code, redirect_uri } = req.body;
    let idToken = idTokenFromBody;

    // If authorization code is provided (OAuth2 popup flow; avoids FedCM), exchange for tokens
    // Backend needs GOOGLE_CLIENT_SECRET and oauth2Client created with it for getToken to work
    if (code && redirect_uri) {
      try {
        const { tokens } = await oauth2Client.getToken({ code, redirect_uri });
        if (!tokens?.id_token) {
          return res.status(400).json({
            success: false,
            message: "No ID token in Google response. Ensure openid scope is requested.",
          });
        }
        idToken = tokens.id_token;
      } catch (exchangeErr) {
        console.error("Google code exchange error:", exchangeErr);
        return res.status(401).json({
          success: false,
          message: "Google sign-in failed. Try again or use email/password.",
        });
      }
    }

    if (!idToken) {
      return res.status(400).json({ 
        success: false, 
        message: "Google ID token or authorization code is required" 
      });
    }

    // Verify the ID token
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // Get user info from verified token
    const payload = ticket.getPayload();
    const { email, given_name, family_name, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Unable to retrieve email from Google token" 
      });
    }

    // Check if user exists (include password field to check if they have one)
    let user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    // If user doesn't exist, create a new one
    if (!user) {
      // Split name into firstName and lastName
      const firstName = given_name || name?.split(' ')[0] || "Google";
      const lastName = family_name || name?.split(' ').slice(1).join(' ') || "User";
      
      // Create user without password (OAuth users don't need passwords)
      user = await User.create({
        firstName: firstName,
        lastName: lastName,
        email: email.toLowerCase(),
        // No password for OAuth users - password field is optional when authProvider is 'google'
        authProvider: "google",
        // country is optional - not provided by Google OAuth
        role: "user",
        subscription: "free",
        profilePicture: picture || undefined,
      });
    } else {
      // If user exists:
      // - If they have a password, they registered with email/password, so keep authProvider as 'local'
      //   (they can use both methods - email/password and Google)
      // - If they don't have a password, they're OAuth-only, so set/update authProvider to 'google'
      let needsSave = false;
      if (!user.password) {
        // User has no password, so they're OAuth-only
        if (!user.authProvider || user.authProvider !== 'google') {
          user.authProvider = 'google';
          needsSave = true;
        }
      }
      // Update profile picture from Google when we have a picture (keeps it current)
      if (picture && user.profilePicture !== picture) {
        user.profilePicture = picture;
        needsSave = true;
      }
      if (needsSave) await user.save();
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        country: user.country,
        role: user.role,
        subscription: user.subscription,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    
    // Handle specific Google verification errors
    if (error.message?.includes("Invalid token") || error.message?.includes("Token used too early")) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid or expired Google ID token" 
      });
    }

    res.status(500).json({ 
      success: false,
      message: "Internal Server Error",
      error: error.message 
    });
  }
};

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// FORGOT PASSWORD – request a password reset email
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password +resetPasswordToken +resetPasswordExpires"
    );

    // Same response whether the account exists or not (prevents email enumeration)
    const successMessage =
      "If an account exists with this email, you will receive a password reset link shortly.";

    if (!user) {
      return res.status(200).json({
        success: true,
        message: successMessage,
      });
    }

    // Only send reset for accounts that can have a password (local or hybrid)
    if (user.authProvider === "google" && !user.password) {
      return res.status(200).json({
        success: true,
        message: successMessage,
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
    await user.save({ validateBeforeSave: false });

    const baseUrl =
      process.env.FRONTEND_URL || process.env.PASSWORD_RESET_BASE_URL || "";
    const resetPath = "/reset-password";
    const resetUrl = baseUrl
      ? `${baseUrl.replace(/\/$/, "")}${resetPath}?token=${rawToken}`
      : "";

    if (!resetUrl) {
      console.error(
        "Forgot password: FRONTEND_URL or PASSWORD_RESET_BASE_URL is not set. Reset link not sent."
      );
      return res.status(200).json({
        success: true,
        message: successMessage,
      });
    }

    const { success, error } = await sendPasswordResetEmail(
      user.email,
      resetUrl,
      user.firstName
    );

    if (!success) {
      console.error("Forgot password: failed to send email", error);
      // Do not reveal send failure to client; clear token so user can try again
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
    }

    return res.status(200).json({
      success: true,
      message: successMessage,
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred. Please try again later.",
    });
  }
};

// FORGOT PASSWORD (complete) – set new password using token from the email link
export const completeForgotPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: "Token is required (from the email link)",
      });
    }

    if (!newPassword || typeof newPassword !== "string") {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const hashedToken = hashToken(token.trim());
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+password +resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired link. Please request a new forgot-password email.",
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password has been updated. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("Complete forgot password error:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred. Please try again later.",
    });
  }
};