import express from 'express';
import cronJob from './utils/corn.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import dotenv from 'dotenv';
// Web Routes
import userRoutes from './routes/web/userAuthRoutes.js';
import guideAuthRoutes from './routes/web/guideAuthRoutes.js';
import guideRoutes from './routes/web/guideRoutes.js';
import trailRoutes from './routes/web/trailRoutes.js';
import trailInfoRoutes from './routes/web/trailInfoRoutes.js';

// Admin Routes
import adminAuthRoutes from './routes/admin/adminAuthRoutes.js';
import adminUserRoutes from './routes/admin/adminUserRoutes.js';
import adminGuideRoutes from './routes/admin/adminGuideRoutes.js';
import adminTrailRoutes from './routes/admin/adminTrailRoutes.js';
import adminStatsRoutes from './routes/admin/adminStatsRoutes.js';
import adminTrailInfoRoutes from './routes/admin/trailInfoRoutes.js';

// Native Routes
import nativeAuthRoutes from './routes/native/auth.routes.js';
import nativeUserRoutes from './routes/native/user.routes.js';
import nativeGuideRoutes from './routes/native/guide.routes.js';
import nativeTrailRoutes from './routes/native/trail.routes.js';
import nativeTrailInfoRoutes from './routes/native/trailInfo.routes.js';
import { nativeRateLimiter } from './middleware/nativeRateLimiter.js';
import { nativeErrorHandler } from './middleware/nativeErrorHandler.js';
import { protectAdminDocs } from './middleware/adminDocsAuth.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT;
connectDB();

cronJob.start();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Root first: show "server is running" only (no old HTML)
app.get('/', (req, res) => {
    res.type('html').send('<!DOCTYPE html><html><head><meta charset="utf-8"><title>YatraX Backend</title></head><body><p>The server is running.</p></body></html>');
});

// Docs and public static files (after / so root is never overridden)
app.use('/docs', express.static(path.join(__dirname, '../docs')));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api-docs/native', (req, res) => {
    res.sendFile(path.join(__dirname, '../docs/native-api-swagger.html'));
});

app.get('/api-docs/web', (req, res) => {
    res.sendFile(path.join(__dirname, '../docs/web-api-swagger.html'));
});

// Admin docs login page
app.get('/admin-docs-login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin-docs-login.html'));
});

// Protected admin docs page
app.get('/api-docs/admin', protectAdminDocs, (req, res) => {
    res.sendFile(path.join(__dirname, '../docs/admin-api-swagger.html'));
});

// Web API Routes
app.use("/api/web/auth/user", userRoutes);
app.use("/api/web/auth/guide", guideAuthRoutes);
app.use("/api/web/guides", guideRoutes);
app.use("/api/web/trails", trailRoutes);
app.use("/api/web/trail-info", trailInfoRoutes);

// Admin API Routes
app.use("/api/admin/trail-info", adminTrailInfoRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/guides", adminGuideRoutes);
app.use("/api/admin/trails", adminTrailRoutes);
app.use("/api/admin/stats", adminStatsRoutes);

// Native API Routes - Apply global rate limiting to all native routes
app.use("/api/native", nativeRateLimiter);
app.use("/api/native/auth", nativeAuthRoutes);
// Mount public routes (trails and guides) before user routes to ensure they're not caught by user route middleware
app.use("/api/native/trails", nativeTrailInfoRoutes);
app.use("/api/native/trails", nativeTrailRoutes);
app.use("/api/native/guides", nativeGuideRoutes);
app.use("/api/native", nativeUserRoutes);

// Error handler for body parser errors (e.g., PayloadTooLargeError)
app.use((error, req, res, next) => {
  if (error.type === 'entity.too.large' || error.name === 'PayloadTooLargeError') {
    // Use app error handler for app routes, otherwise use default
    if (req.path.startsWith("/api/native")) {
      return nativeErrorHandler(error, req, res, next);
    }
    return res.status(413).json({
      success: false,
      message: 'Request entity too large. Maximum size is 50MB.',
    });
  }
  next(error);
});

// Native-specific error handler (must be before global handler)
app.use(nativeErrorHandler);

// Global error handler (for non-app routes)
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});