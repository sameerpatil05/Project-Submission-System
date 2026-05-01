const Project = require('../models/Project');

// POST /api/projects
exports.submitProject = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'Project file is required' });

    const { title, description, category, deadline, versionNotes } = req.body;

    const project = await Project.create({
      title, description, category,
      deadline: deadline ? new Date(deadline) : null,
      student:  req.user.id,
      currentVersion: 1,
      versions: [{
        versionNumber: 1,
        filePath:  req.file.path,
        fileName:  req.file.originalname,
        fileSize:  req.file.size,
        notes:     versionNotes || 'Initial submission',
      }],
    });

    await project.populate('student', 'name email');
    res.status(201).json({ success: true, message: 'Project submitted', project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/projects/:id/version
exports.uploadNewVersion = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'File is required' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.student.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const newVer = project.currentVersion + 1;
    project.versions.push({
      versionNumber: newVer,
      filePath:  req.file.path,
      fileName:  req.file.originalname,
      fileSize:  req.file.size,
      notes:     req.body.versionNotes || `Version ${newVer}`,
    });
    project.currentVersion = newVer;
    project.status         = 'pending';
    await project.save();

    res.json({ success: true, message: `Version ${newVer} uploaded`, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/projects/my
exports.getMyProjects = async (req, res) => {
  try {
    const projects = await Project.find({ student: req.user.id })
      .populate('assignedTeacher', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: projects.length, projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/projects
exports.getAllProjects = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (search) query.title = { $regex: search, $options: 'i' };

    const projects = await Project.find(query)
      .populate('student',         'name email enrollmentId department')
      .populate('assignedTeacher', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: projects.length, projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/projects/:id
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('student',         'name email enrollmentId department')
      .populate('assignedTeacher', 'name email');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Students can only view their own projects
    if (req.user.role === 'student' && project.student._id.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/projects/:id/assign
exports.assignTeacher = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { assignedTeacher: req.user.id, status: 'under_review' },
      { new: true }
    ).populate('student', 'name email').populate('assignedTeacher', 'name email');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Assigned and marked under review', project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/projects/:id/status
exports.updateProjectStatus = async (req, res) => {
  try {
    const { status, marks } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.id, { status, marks }, { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project updated', project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/projects/:id
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    if (project.student.toString() !== req.user.id && req.user.role !== 'teacher')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    await project.deleteOne();
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/projects/stats
exports.getDashboardStats = async (req, res) => {
  try {
    let stats = {};

    if (req.user.role === 'student') {
      const projects = await Project.find({ student: req.user.id });
      const graded   = projects.filter(p => p.marks !== null);
      const avgMarks = graded.length
        ? graded.reduce((sum, p) => sum + p.marks, 0) / graded.length
        : 0;
      stats = {
        total:        projects.length,
        pending:      projects.filter(p => p.status === 'pending').length,
        under_review: projects.filter(p => p.status === 'under_review').length,
        reviewed:     projects.filter(p => ['reviewed', 'approved'].includes(p.status)).length,
        rejected:     projects.filter(p => p.status === 'rejected').length,
        avgMarks,
      };
    } else {
      const projects = await Project.find({});
      stats = {
        total:        projects.length,
        pending:      projects.filter(p => p.status === 'pending').length,
        under_review: projects.filter(p => p.status === 'under_review').length,
        reviewed:     projects.filter(p => ['reviewed', 'approved'].includes(p.status)).length,
        rejected:     projects.filter(p => p.status === 'rejected').length,
      };
    }

    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};