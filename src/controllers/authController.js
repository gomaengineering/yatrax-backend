import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import { oauth2Client } from "../utils/googleConfig.js";

// 🧩 REGISTER USER
export const registerUser = async (req, res) => {
  try {
    const { FirstName, LastName, email, password, confirmPassword, country, role, subscription } = req.body;

    // Validate required fields
    if (!FirstName || !LastName || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "FirstName, LastName, email, and password are required" 
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

    // Create user
    const newUser = await User.create({ 
      FirstName, 
      LastName, 
      email: email.toLowerCase(), 
      password, 
      country,
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
        FirstName: newUser.FirstName,
        LastName: newUser.LastName,
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

// 🔑 LOGIN USER (Email only)
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
        FirstName: user.FirstName,
        LastName: user.LastName,
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

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });

    // If user doesn't exist, create a new one
    if (!user) {
      // Split name into FirstName and LastName
      const firstName = given_name || name?.split(' ')[0] || "Google";
      const lastName = family_name || name?.split(' ').slice(1).join(' ') || "User";
      
      // Generate temporary password for Google OAuth users
      const tempPassword = `google_${Math.random().toString(36).slice(-12)}`;
      
      user = await User.create({
        FirstName: firstName,
        LastName: lastName,
        email: email.toLowerCase(),
        password: tempPassword, // Will be hashed by pre-save hook
        // country is optional - not provided by Google OAuth
        role: "user",
        subscription: "free",
      });
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        FirstName: user.FirstName,
        LastName: user.LastName,
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