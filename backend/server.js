require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/project'));
app.use('/api/reviews', require('./routes/review'));

app.get('/', (req, res) => {
  res.json({ message: 'API running 🚀' });
});

// ❌ REMOVE app.listen
module.exports = app;