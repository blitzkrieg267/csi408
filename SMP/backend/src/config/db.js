const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("MongoDB Connected Successfully ✅");
    } catch (error) {
        console.error("MongoDB Connection Failed ❌", error);
        process.exit(1); // Exit on failure
    }
};

// ✅ Function to get Mongoose connection
const getDB = () => mongoose.connection;

module.exports = { connectDB, getDB };
