import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
    //   // Options for stability & compatibility
    //   useNewUrlParser: true,
    //   useUnifiedTopology: true
    });

    console.log(`🟢 MongoDB Connected: ${conn.connection.host}`);

    // Connection events logging
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB reconnected!");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB Error:", err);
    });

  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // completely stop server
  }
};

export default connectDB;
