const express = require('express');
const router  = express.Router();
const {
  addReview, getProjectReviews, updateReview, deleteReview, getTeacherReviews,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

// Must be before /:projectId
router.get('/teacher/all', protect, authorize('teacher'), getTeacherReviews);

// Project-level
router.post('/:projectId', protect, authorize('teacher'), addReview);
router.get('/:projectId',  protect, getProjectReviews);

// Single review
router.put('/single/:reviewId',    protect, authorize('teacher'), updateReview);
router.delete('/single/:reviewId', protect, authorize('teacher'), deleteReview);

module.exports = router;