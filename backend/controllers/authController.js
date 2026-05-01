const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

const userPayload = (user) => ({
  id:           user._id,
  name:         user.name,
  email:        user.email,
  role:         user.role,
  enrollmentId: user.enrollmentId,
  department:   user.department,
});

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, enrollmentId, department } = req.body;

    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const user  = await User.create({ name, email, password, role, enrollmentId, department });
    const token = signToken(user._id);

    res.status(201).json({ success: true, message: 'Registration successful', token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = signToken(user._id);
    res.json({ success: true, message: 'Login successful', token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/teachers
exports.getTeachers = async (_req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('name email department');
    res.json({ success: true, teachers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};