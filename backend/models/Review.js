const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true,
  },
  versionReviewed: { type: Number, required: true },
  comment:  { type: String, required: [true, 'Comment is required'], trim: true },
  feedback: { type: String, trim: true },
  marks:    { type: Number, min: 0, max: 100, default: null },
  status: {
    type: String,
    enum: ['under_review', 'reviewed', 'approved', 'rejected', 'resubmit'],
    default: 'under_review',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ReviewSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Review', ReviewSchema);