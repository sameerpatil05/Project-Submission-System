const mongoose = require('mongoose');

const VersionSchema = new mongoose.Schema({
  versionNumber: { type: Number, required: true },
  filePath:      { type: String, required: true },
  fileName:      { type: String, required: true },
  fileSize:      { type: Number },
  notes:         { type: String, trim: true },
  uploadedAt:    { type: Date, default: Date.now },
});

const ProjectSchema = new mongoose.Schema({
  title: {
    type: String, required: [true, 'Title is required'], trim: true,
  },
  description: {
    type: String, required: [true, 'Description is required'], trim: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true,
  },
  assignedTeacher: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null,
  },
  category:       { type: String, trim: true, default: 'General' },
  deadline:       { type: Date },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'reviewed', 'approved', 'rejected', 'resubmit'],
    default: 'pending',
  },
  versions:       [VersionSchema],
  currentVersion: { type: Number, default: 1 },
  marks:          { type: Number, min: 0, max: 100, default: null },
  createdAt:      { type: Date, default: Date.now },
  updatedAt:      { type: Date, default: Date.now },
});

ProjectSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Project', ProjectSchema);