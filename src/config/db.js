import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URI)
        console.log("MongoDB connected Successfully...")
        
        // Drop phone indexes after connection (one-time migration)
        await dropPhoneIndexes();
    }catch(err){
        console.error("MongoDB Connection Error:", err)
    }
}

/**
 * Drop phone-related indexes to fix duplicate key errors
 */
const dropPhoneIndexes = async () => {
    try {
        const db = mongoose.connection.db;
        const collection = db.collection("users");
        
        // Get all indexes
        const indexes = await collection.indexes();
        
        // Find and drop phone-related indexes
        const phoneIndexes = indexes.filter(idx => {
            const indexName = idx.name.toLowerCase();
            const indexKeys = Object.keys(idx.key || {}).map(k => k.toLowerCase());
            return indexName.includes("phone") || indexKeys.some(k => k.includes("phone"));
        });
        
        if (phoneIndexes.length > 0) {
            for (const index of phoneIndexes) {
                try {
                    await collection.dropIndex(index.name);
                    console.log(`✅ Dropped phone index: ${index.name}`);
                } catch (err) {
                    // Index might already be dropped or not exist
                    if (err.code !== 27 && err.codeName !== "IndexNotFound") {
                        console.log(`⚠️  Could not drop index ${index.name}:`, err.message);
                    }
                }
            }
        }
    } catch (error) {
        // Don't fail connection if index dropping fails
        console.log("ℹ️  Could not check/drop phone indexes:", error.message);
    }
}

export default connectDB;