import User from "../../models/userModel.js";
import generateToken from "../../utils/generateToken.js";
import { oauth2Client } from "../../utils/googleConfig.js";

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
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🔐 GOOGLE LOGIN
export const googleLogin = async (req, res) => {
  try {
    // Check if req.body exists
    if (!req.body) {
      return res.status(400).json({ 
        success: false, 
        message: "Request body is missing. Make sure to send JSON data." 
      });
    }

    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ 
        success: false, 
        message: "Google ID token is required" 
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
      });
    } else {
      // If user exists:
      // - If they have a password, they registered with email/password, so keep authProvider as 'local'
      //   (they can use both methods - email/password and Google)
      // - If they don't have a password, they're OAuth-only, so set/update authProvider to 'google'
      if (!user.password) {
        // User has no password, so they're OAuth-only
        if (!user.authProvider || user.authProvider !== 'google') {
          user.authProvider = 'google';
          await user.save();
        }
      }
      // If user has password, don't change their authProvider (they can use both methods)
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

