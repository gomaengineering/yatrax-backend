// utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary using CLOUDINARY_URL environment variable
if (process.env.CLOUDINARY_URL) {
  // Parse CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
  const url = new URL(process.env.CLOUDINARY_URL);
  cloudinary.config({
    cloud_name: url.hostname,
    api_key: url.username,
    api_secret: url.password,
  });
} else {
  // Fallback to individual environment variables if CLOUDINARY_URL is not set
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// Create multer upload middleware (optional - won't error if no file)
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed!'));
    }
  },
});

// Optional upload middleware - doesn't error if no file is provided
export const optionalUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only validate if file is provided
    if (!file) {
      return cb(null, true);
    }
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed!'));
    }
  },
});

// Middleware factory to upload file to Cloudinary with configurable folder
export const createUploadToCloudinary = (folder = 'featured-trails') => {
  return async (req, res, next) => {
    // Check for files (using .any() returns req.files array)
    const files = req.files || (req.file ? [req.file] : []);
    
    if (files.length === 0) {
      return next();
    }

    // Process the first file (if multiple files are uploaded, use the first one)
    const file = files[0];

    try {
      // Convert buffer to stream
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [{ width: 1200, height: 800, crop: 'limit' }],
        },
        (error, result) => {
          if (error) {
            return res.status(400).json({
              success: false,
              message: 'Failed to upload image to Cloudinary',
              error: error.message,
            });
          }
          // Attach Cloudinary URL to file.path for controller to use
          file.path = result.secure_url;
          file.public_id = result.public_id;
          // Also update req.files array
          if (req.files) {
            req.files[0] = file;
          }
          next();
        }
      );

      // Convert buffer to stream
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      bufferStream.pipe(stream);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to process image upload',
        error: error.message,
      });
    }
  };
};

// Default middleware for backward compatibility
export const uploadToCloudinary = createUploadToCloudinary('featured-trails');

// Helper function to upload image directly (for base64 or URL)
export const uploadImage = async (imagePath, folder = 'featured-trails') => {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1200, height: 800, crop: 'limit' }],
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

// Helper function to delete image from Cloudinary
export const deleteImage = async (imageUrl) => {
  try {
    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{filename}.{ext}
    const urlParts = imageUrl.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL');
    }
    
    // Get the path after 'upload'
    const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/'); // Skip 'upload' and version
    // Remove file extension
    const publicId = pathAfterUpload.split('.')[0];
    
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

export default cloudinary;

