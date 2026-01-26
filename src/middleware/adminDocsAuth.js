// middleware/adminDocsAuth.js
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Guide from "../models/guideModel.js";

/**
 * Middleware to protect admin API documentation page
 * Checks for JWT token in sessionStorage (sent via custom header) or query parameter
 */
export const protectAdminDocs = async (req, res, next) => {
  try {
    let token = null;

    // Check for token in query parameter (from login redirect)
    if (req.query.token) {
      token = req.query.token;
    }
    // Check for token in custom header (from frontend sessionStorage)
    else if (req.headers['x-admin-docs-token']) {
      token = req.headers['x-admin-docs-token'];
    }
    // Check for token in cookie (if using cookies)
    else if (req.cookies && req.cookies.adminDocsToken) {
      token = req.cookies.adminDocsToken;
    }

    if (!token) {
      // Redirect to login page
      return res.redirect('/admin-docs-login');
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Verify admin role
      if (decoded.role !== "admin") {
        return res.redirect('/admin-docs-login?error=not_admin');
      }

      // Find admin to verify they still exist
      let admin = null;
      if (decoded.role === "admin") {
        // Try User model first
        admin = await User.findById(decoded.id);
        if (!admin || admin.role !== "admin") {
          // Try Guide model
          admin = await Guide.findById(decoded.id);
        }
      }

      if (!admin || admin.role !== "admin") {
        return res.redirect('/admin-docs-login?error=not_found');
      }

      // Store admin info in request for potential use
      req.adminId = decoded.id;
      req.adminRole = decoded.role;
      req.admin = admin;

      next();
    } catch (error) {
      // Token invalid or expired
      return res.redirect('/admin-docs-login?error=invalid_token');
    }
  } catch (error) {
    console.error("Admin docs auth middleware error:", error);
    return res.redirect('/admin-docs-login?error=server_error');
  }
};
