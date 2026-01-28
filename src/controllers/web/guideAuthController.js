import Guide from "../../models/guideModel.js";
import TrailInfo from "../../models/trailInfoModel.js";
import generateToken from "../../utils/generateToken.js";
import { uploadImage } from "../../utils/cloudinary.js";

//  REGISTER GUIDE
export const registerGuide = async (req, res) => {
  try {
    let { 
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

    // Handle photo upload
    let photoUrl = null;
    
    // Check for file upload (multer handles files with any field name)
    const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : null;
    
    if (uploadedFile && uploadedFile.path) {
      // Image uploaded via multer (file upload)
      photoUrl = uploadedFile.path; // Cloudinary returns secure_url in path
    } else if (req.body.photoUrl || req.body.photo) {
      // Image provided as URL or base64 in body
      const photoInput = req.body.photoUrl || req.body.photo;
      try {
        photoUrl = await uploadImage(photoInput, 'guides');
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Failed to upload photo to Cloudinary',
          error: error.message,
        });
      }
    }
    // Photo is optional, so we don't require it

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

    // Parse JSON strings if they come from FormData
    // FormData sends nested objects/arrays as JSON strings
    // If they're already arrays (from JSON request), keep them as is
    try {
      if (trekAreas && typeof trekAreas === 'string' && trekAreas.trim()) {
        trekAreas = JSON.parse(trekAreas);
      }
      if (languages && typeof languages === 'string' && languages.trim()) {
        languages = JSON.parse(languages);
      }
      if (certifications && typeof certifications === 'string' && certifications.trim()) {
        certifications = JSON.parse(certifications);
      }
      // Parse numeric values that might come as strings from FormData
      if (typeof experience === 'string') {
        experience = parseInt(experience, 10);
      }
      if (typeof ratePerDay === 'string') {
        ratePerDay = parseFloat(ratePerDay);
      }
    } catch (parseError) {
      console.error('Error parsing FormData fields:', parseError);
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON format for array or numeric fields',
        error: parseError.message,
      });
    }

    // Validate trekAreas (should be array of trailInfo IDs)
    if (!Array.isArray(trekAreas) || trekAreas.length === 0) {
      return res.status(400).json({
        success: false,
        message: "trekAreas must be a non-empty array of trailInfo IDs",
      });
    }

    // Validate that all trailInfo IDs exist
    const validTrailInfos = await TrailInfo.find({
      _id: { $in: trekAreas },
    });

    if (validTrailInfos.length !== trekAreas.length) {
      const foundIds = validTrailInfos.map((t) => t._id.toString());
      const invalidIds = trekAreas.filter(
        (id) => !foundIds.includes(id.toString())
      );
      return res.status(400).json({
        success: false,
        message: `Invalid trailInfo IDs: ${invalidIds.join(", ")}`,
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

    // Check if TBNumber already exists
    const existingTBNumber = await Guide.findOne({ TBNumber });
    if (existingTBNumber) {
      return res.status(400).json({
        success: false,
        message: "TBNumber already in use",
      });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    // Create guide (without trails first)
    const newGuide = await Guide.create({ 
      firstName, 
      lastName, 
      email: email.toLowerCase(), 
      password, 
      role: role || "guide",
      description,
      TBNumber,
      experience,
      education,
      languages,
      ratePerDay,
      certifications,
      photo: photoUrl
    });

    // Assign trails to guide (syncs both sides and formats properly with IDs and names)
    if (trekAreas && trekAreas.length > 0) {
      await Guide.assignTrailsToGuide(newGuide._id, trekAreas);
    }

    // Fetch the guide with properly formatted trekAreas (contains _id and name)
    const guideWithTrails = await Guide.findById(newGuide._id)
      .select("-password");

    // Generate JWT token using the utility function
    const token = generateToken(newGuide._id, newGuide.role);

    // Convert to object for response
    const guideResponse = guideWithTrails.toObject();

    res.status(201).json({
      success: true,
      message: "Guide registered successfully",
      token,
      guide: {
        id: guideResponse._id,
        firstName: guideResponse.firstName,
        lastName: guideResponse.lastName,
        email: guideResponse.email,
        role: guideResponse.role,
        description: guideResponse.description,
        TBNumber: guideResponse.TBNumber,
        trekAreas: guideResponse.trekAreas,
        experience: guideResponse.experience,
        education: guideResponse.education,
        languages: guideResponse.languages,
        ratePerDay: guideResponse.ratePerDay,
        certifications: guideResponse.certifications,
        photo: guideResponse.photo,
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
        photo: guide.photo,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

