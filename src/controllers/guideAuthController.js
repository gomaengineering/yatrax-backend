import Guide from "../models/guideModel.js";
import generateToken from "../utils/generateToken.js";

//  REGISTER GUIDE
export const registerGuide = async (req, res) => {
  try {
    const { 
      FirstName, 
      LastName, 
      email, 
      password, 
      confirmPassword, 
      role, 
      Description, 
      TBNumber, 
      TrekAreas, 
      Experience, 
      Education, 
      Languages, 
      RatePerDay, 
      Certifications 
    } = req.body;

    // Validate required fields
    if (!FirstName || !LastName || !email || !password || !Description || !TBNumber || 
        !TrekAreas || !Experience || !Education || !Languages || !RatePerDay || !Certifications) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required: FirstName, LastName, email, password, Description, TBNumber, TrekAreas, Experience, Education, Languages, RatePerDay, Certifications" 
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
    if (!Array.isArray(TrekAreas) || TrekAreas.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "TrekAreas must be a non-empty array" 
      });
    }

    if (!Array.isArray(Languages) || Languages.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Languages must be a non-empty array" 
      });
    }

    if (!Array.isArray(Certifications) || Certifications.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Certifications must be a non-empty array" 
      });
    }

    // Validate RatePerDay
    if (typeof RatePerDay !== 'number' || RatePerDay < 0) {
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
      FirstName, 
      LastName, 
      email: email.toLowerCase(), 
      password, 
      role: role || "guide",
      Description,
      TBNumber,
      TrekAreas,
      Experience,
      Education,
      Languages,
      RatePerDay,
      Certifications
    });

    // Generate JWT token using the utility function
    const token = generateToken(newGuide._id, newGuide.role);

    res.status(201).json({
      success: true,
      message: "Guide registered successfully",
      token,
      guide: {
        id: newGuide._id,
        FirstName: newGuide.FirstName,
        LastName: newGuide.LastName,
        email: newGuide.email,
        role: newGuide.role,
        Description: newGuide.Description,
        TBNumber: newGuide.TBNumber,
        TrekAreas: newGuide.TrekAreas,
        Experience: newGuide.Experience,
        Education: newGuide.Education,
        Languages: newGuide.Languages,
        RatePerDay: newGuide.RatePerDay,
        Certifications: newGuide.Certifications,
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
        FirstName: guide.FirstName,
        LastName: guide.LastName,
        email: guide.email,
        role: guide.role,
        Description: guide.Description,
        TBNumber: guide.TBNumber,
        TrekAreas: guide.TrekAreas,
        Experience: guide.Experience,
        Education: guide.Education,
        Languages: guide.Languages,
        RatePerDay: guide.RatePerDay,
        Certifications: guide.Certifications,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

