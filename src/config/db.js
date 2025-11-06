import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URI)
        console.log("MongoDB connected Successfully...")
    }catch(err){
        console.error("MongoDB Connection Error:", err)
    }
}

export default connectDB;