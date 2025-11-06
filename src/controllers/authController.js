import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import { oauth2Client } from "../utils/googleConfig.js";

// 🧩 REGISTER USER
export const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword ,role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email or phone already in use" });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    // Create user
    const newUser = await User.create({ name, email, phone, password, role });

    // Generate JWT token using the utility function
    const token = generateToken(newUser._id, newUser.role);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🔑 LOGIN USER
export const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body; // 'identifier' can be email or phone

    // Basic validation
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/phone and password are required",
      });
    }

    // Determine if the identifier is an email or phone number
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    let query;
    if (isEmail) {
      query = { email: identifier.toLowerCase() };
    } else {
      query = { phone: identifier };
    }

    // Find user
    const user = await User.findOne(query).select("+password");
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
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

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
    const { email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Unable to retrieve email from Google token" 
      });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    // If user doesn't exist, create a new one
    if (!user) {
      // For Google OAuth users, we don't have phone/password
      // Generate a random phone number or make it optional
      // For now, we'll use a placeholder that won't conflict
      const tempPhone = `google_${Date.now()}`;
      const tempPassword = `google_${Math.random().toString(36).slice(-12)}`;
      
      user = await User.create({
        name: name || "Google User",
        email: email.toLowerCase(),
        phone: tempPhone,
        password: tempPassword, // Will be hashed by pre-save hook
        role: "user",
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
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    
    // Handle specific Google verification errors
    if (error.message?.includes("Invalid token")) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid Google ID token" 
      });
    }

    res.status(500).json({ 
      success: false,
      message: "Internal Server Error",
      error: error.message 
    });
  }
};