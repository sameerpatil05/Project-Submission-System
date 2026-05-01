const express = require('express');
const router  = express.Router();
const {
  submitProject, uploadNewVersion, getMyProjects, getAllProjects,
  getProject, assignTeacher, updateProjectStatus, deleteProject, getDashboardStats,
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../config/multer');

// Stats & filtered lists (must come before /:id)
router.get('/stats', protect, getDashboardStats);
router.get('/my',    protect, authorize('student'), getMyProjects);
router.get('/',      protect, authorize('teacher'), getAllProjects);

// Create & version upload
router.post('/',              protect, authorize('student'), upload.single('projectFile'), submitProject);
router.post('/:id/version',   protect, authorize('student'), upload.single('projectFile'), uploadNewVersion);

// Single project
router.get('/:id',            protect, getProject);
router.put('/:id/assign',     protect, authorize('teacher'), assignTeacher);
router.put('/:id/status',     protect, authorize('teacher'), updateProjectStatus);
router.delete('/:id',         protect, deleteProject);

module.exports = router;