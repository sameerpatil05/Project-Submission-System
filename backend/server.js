require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();
connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/project'));
app.use('/api/reviews', require('./routes/review'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Handle unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));