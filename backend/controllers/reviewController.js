const Review  = require('../models/Review');
const Project = require('../models/Project');

// POST /api/reviews/:projectId
exports.addReview = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const { comment, feedback, marks, status } = req.body;

    const review = await Review.create({
      project:         project._id,
      teacher:         req.user.id,
      student:         project.student,
      versionReviewed: project.currentVersion,
      comment, feedback,
      marks:  marks !== undefined ? marks : null,
      status: status || 'reviewed',
    });

    // Sync status & marks back to the project
    project.status = status || 'reviewed';
    if (marks !== undefined && marks !== null) project.marks = marks;
    await project.save();

    await review.populate('teacher', 'name email');
    res.status(201).json({ success: true, message: 'Review submitted', review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reviews/:projectId
exports.getProjectReviews = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    if (req.user.role === 'student' && project.student.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const reviews = await Review.find({ project: req.params.projectId })
      .populate('teacher', 'name email department')
      .populate('student', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: reviews.length, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/reviews/single/:reviewId
exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (review.teacher.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const { comment, feedback, marks, status } = req.body;
    if (comment)              review.comment  = comment;
    if (feedback !== undefined) review.feedback = feedback;
    if (marks    !== undefined) review.marks   = marks;
    if (status)               review.status   = status;
    await review.save();

    // Sync to project
    if (marks !== undefined || status) {
      await Project.findByIdAndUpdate(review.project, {
        ...(marks !== undefined && { marks }),
        ...(status && { status }),
      });
    }

    res.json({ success: true, message: 'Review updated', review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/reviews/single/:reviewId
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (review.teacher.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    await review.deleteOne();
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reviews/teacher/all
exports.getTeacherReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ teacher: req.user.id })
      .populate('project', 'title status currentVersion')
      .populate('student', 'name email enrollmentId')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: reviews.length, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};