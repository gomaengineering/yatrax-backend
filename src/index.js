import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import dotenv from 'dotenv';
import userRoutes from './routes/userAuthRoutes.js';
import guideRoutes from './routes/guideAuthRoutes.js';
import trailRoutes from './routes/trailRoutes.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
connectDB();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});