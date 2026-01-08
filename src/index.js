import express from 'express';
import cronJob from './utils/corn.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import dotenv from 'dotenv';
import userRoutes from './routes/userAuthRoutes.js';
import guideRoutes from './routes/guideAuthRoutes.js';
import trailRoutes from './routes/trailRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import adminUserRoutes from './routes/adminUserRoutes.js';
import adminGuideRoutes from './routes/adminGuideRoutes.js';
import adminTrailRoutes from './routes/adminTrailRoutes.js';
import adminStatsRoutes from './routes/adminStatsRoutes.js';
import trailInfoRoutes from './routes/trailInfoRoutes.js';

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

app.get('/api-docs', (req, res) => {
    res.sendFile(path.join(__dirname, '../docs/api-documentation.html'));
});

app.use("/api/auth/user", userRoutes);
app.use("/api/auth/guide", guideRoutes);
app.use("/api/trails", trailRoutes);

// Admin Routes
app.use("/api/admin/trail-info", trailInfoRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/guides", adminGuideRoutes);
app.use("/api/admin/trails", adminTrailRoutes);
app.use("/api/admin/stats", adminStatsRoutes);

// Error handler for body parser errors (e.g., PayloadTooLargeError)
app.use((error, req, res, next) => {
  if (error.type === 'entity.too.large' || error.name === 'PayloadTooLargeError') {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large. Maximum size is 50MB.',
    });
  }
  next(error);
});

// Global error handler
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