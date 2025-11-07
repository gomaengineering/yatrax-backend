import Guide from "../models/guideModel.js";
import generateToken from "../utils/generateToken.js";

//  REGISTER GUIDE
export const registerGuide = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      confirmPassword, 
      role, 
      description, 
      TBNumber, 
      trekAreas, 
      experience, 
      education, 
      languages, 
      ratePerDay, 
      certifications 
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !description || !TBNumber || 
        !trekAreas || !experience || !education || !languages || !ratePerDay || !certifications) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required: FirstName, lastName, email, password, Description, TBNumber, TrekAreas, Experience, Education, Languages, RatePerDay, Certifications" 
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 8 characters long" 
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

    // Validate arrays
    if (!Array.isArray(trekAreas) || trekAreas.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "TrekAreas must be a non-empty array" 
      });
    }

    if (!Array.isArray(languages) || languages.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Languages must be a non-empty array" 
      });
    }

    if (!Array.isArray(certifications) || certifications.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Certifications must be a non-empty array" 
      });
    }

    // Validate RatePerDay
    if (typeof ratePerDay !== 'number' || ratePerDay < 0) {
      return res.status(400).json({ 
        success: false, 
        message: "RatePerDay must be a positive number" 
      });
    }

    // Check if guide already exists by email
    const existingGuide = await Guide.findOne({ email: email.toLowerCase() });
    if (existingGuide) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    // Create guide
    const newGuide = await Guide.create({ 
      firstName, 
      lastName, 
      email: email.toLowerCase(), 
      password, 
      role: role || "guide",
      description,
      TBNumber,
      trekAreas,
      experience,
      education,
      languages,
      ratePerDay,
      certifications
    });

    // Generate JWT token using the utility function
    const token = generateToken(newGuide._id, newGuide.role);

    res.status(201).json({
      success: true,
      message: "Guide registered successfully",
      token,
      guide: {
        id: newGuide._id,
        firstName: newGuide.firstName,
        lastName: newGuide.lastName,
        email: newGuide.email,
        role: newGuide.role,
        description: newGuide.description,
        TBNumber: newGuide.TBNumber,
        trekAreas: newGuide.trekAreas,
        experience: newGuide.experience,
        education: newGuide.education,
        languages: newGuide.languages,
        ratePerDay: newGuide.ratePerDay,
        certifications: newGuide.certifications,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

//  LOGIN GUIDE (Email only)
export const loginGuide = async (req, res) => {
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

    // Find guide by email only
    const guide = await Guide.findOne({ email: email.toLowerCase() }).select("+password");
    if (!guide) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Compare passwords
    const isMatch = await guide.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token using the utility function
    const token = generateToken(guide._id, guide.role);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      guide: {
        id: guide._id,
        firstName: guide.firstName,
        lastName: guide.lastName,
        email: guide.email,
        role: guide.role,
        description: guide.description,
        TBNumber: guide.TBNumber,
        trekAreas: guide.trekAreas,
        experience: guide.experience,
        education: guide.education,
        languages: guide.languages,
        ratePerDay: guide.ratePerDay,
        certifications: guide.certifications,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

