const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB Error: ${err.message}`);

    // ❗ DO NOT EXIT (important for deployment)
    // process.exit(1); ❌ REMOVE THIS
  }
};

module.exports = connectDB;