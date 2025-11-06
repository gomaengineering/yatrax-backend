import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

/**
 * Drop the phone index from the users collection
 * This fixes the duplicate key error when phone field was removed
 */
export const dropPhoneIndex = async () => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection("users");
    
    // Get all indexes
    const indexes = await collection.indexes();
    console.log("Current indexes:", indexes.map(idx => idx.name));
    
    // Drop phone-related indexes
    const phoneIndexes = indexes.filter(idx => 
      idx.name.includes("phone") || 
      Object.keys(idx.key || {}).some(key => key.toLowerCase().includes("phone"))
    );
    
    if (phoneIndexes.length > 0) {
      for (const index of phoneIndexes) {
        try {
          await collection.dropIndex(index.name);
          console.log(`✅ Dropped index: ${index.name}`);
        } catch (err) {
          // Index might not exist or already dropped
          if (err.code !== 27) { // 27 = IndexNotFound
            console.log(`⚠️  Could not drop index ${index.name}:`, err.message);
          }
        }
      }
    } else {
      console.log("ℹ️  No phone indexes found to drop");
    }
  } catch (error) {
    console.error("Error dropping phone index:", error.message);
  }
};

