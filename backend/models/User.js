const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String, required: [true, 'Name is required'], trim: true,
  },
  email: {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true, trim: true,
  },
  password: {
    type: String, required: [true, 'Password is required'],
    minlength: 6, select: false,
  },
  role: {
    type: String, enum: ['student', 'teacher'], default: 'student',
  },
  enrollmentId: { type: String, trim: true },
  department:   { type: String, trim: true },
  createdAt:    { type: Date,   default: Date.now },
});

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt    = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with stored hash
UserSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', UserSchema);