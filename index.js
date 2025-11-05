import express, { urlencoded } from 'express';
import connectDB from './config/db.js';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('YatraX Backend is running');
});

app.use("/api/auth", userRoutes)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});