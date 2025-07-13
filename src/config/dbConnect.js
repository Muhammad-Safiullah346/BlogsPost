const mongoose = require("mongoose");

// Connect to MongoDB
const connectDB = async () => {
  try {
    const Db = process.env.DATABASE.replace(
      "<PASSWORD>",
      process.env.DATABASE_PASSWORD
    );

    await mongoose.connect(Db);
    console.log("DB connection successful!");
  } catch (err) {
    console.error("DB connection error:", err);
    process.exit(1);
  }
};

// Call the connection function
connectDB();

module.exports = mongoose;
