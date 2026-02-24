import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const fixIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // Get the bookings collection directly
        const db = mongoose.connection.db;
        const collection = db.collection('bookings');

        // List all indexes to verify
        const indexes = await collection.indexes();
        console.log("Current indexes:", indexes);

        // Drop the old razorpayOrderId index if it exists
        const hasRazorpayIndex = indexes.some(idx => idx.name === 'razorpayOrderId_1');
        if (hasRazorpayIndex) {
            await collection.dropIndex('razorpayOrderId_1');
            console.log("Dropped index: razorpayOrderId_1");
        } else {
            console.log("Index razorpayOrderId_1 not found, nothing to drop.");
        }

        mongoose.disconnect();
        console.log("Disconnected. Fix complete.");
    } catch (error) {
        console.error("Error fixing indexes:", error);
        process.exit(1);
    }
};

fixIndexes();
