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

// App Routes
import appAuthRoutes from './routes/app/auth.routes.js';
import appUserRoutes from './routes/app/user.routes.js';
import appGuideRoutes from './routes/app/guide.routes.js';
import appTrailRoutes from './routes/app/trail.routes.js';
import appTrailInfoRoutes from './routes/app/trailInfo.routes.js';
import { appRateLimiter } from './middleware/appRateLimiter.js';
import { appErrorHandler } from './middleware/appErrorHandler.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
connectDB();

cronJob.start();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve docs directory
app.use('/docs', express.static(path.join(__dirname, '../docs')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/api-docs/app', (req, res) => {
    res.sendFile(path.join(__dirname, '../docs/app-api-swagger.html'));
});

app.get('/api-docs/web', (req, res) => {
    res.sendFile(path.join(__dirname, '../docs/web-api-swagger.html'));
});

app.get('/api-docs/admin', (req, res) => {
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

// App API Routes - Apply global rate limiting to all app routes
app.use("/api/v1/app", appRateLimiter);
app.use("/api/v1/app/auth", appAuthRoutes);
app.use("/api/v1/app", appUserRoutes);
app.use("/api/v1/app/guides", appGuideRoutes);
// Mount trailInfo routes before trail routes to avoid route conflicts (more specific route first)
app.use("/api/v1/app/trails", appTrailInfoRoutes);
app.use("/api/v1/app/trails", appTrailRoutes);

// Error handler for body parser errors (e.g., PayloadTooLargeError)
app.use((error, req, res, next) => {
  if (error.type === 'entity.too.large' || error.name === 'PayloadTooLargeError') {
    // Use app error handler for app routes, otherwise use default
    if (req.path.startsWith("/api/v1/app")) {
      return appErrorHandler(error, req, res, next);
    }
    return res.status(413).json({
      success: false,
      message: 'Request entity too large. Maximum size is 50MB.',
    });
  }
  next(error);
});

// App-specific error handler (must be before global handler)
app.use(appErrorHandler);

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