const express = require('express');
const Project = require('../models/Project');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const upload = multer({ dest: 'uploads/' });

// Require auth for all routes
router.use(auth);

// Get all projects
router.get('/', async (req, res) => {
  try {
    let projects;
    if (req.user.role === 'Auditor') {
      // Find audits assigned to this auditor
      const Audit = require('../models/Audit');
      const audits = await Audit.find({ assignedAuditor: req.user.userId }).select('project');
      // Ensure unique project IDs
      const projectIds = [...new Set(audits.map(a => a.project.toString()))];
      projects = await Project.find({ _id: { $in: projectIds } });
    } else {
      projects = await Project.find();
    }
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new project (Admin only)
router.post('/', roles('Admin'), async (req, res) => {
  try {
    const project = new Project(req.body);
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get a project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a project (Admin only)
router.put('/:id', roles('Admin'), async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a project (Admin only)
router.delete('/:id', roles('Admin'), async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk upload projects via Excel (Admin only)
router.post('/bulk-upload', roles('Admin'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    // Normalize headers for each row
    function getField(row, ...variants) {
      for (const v of variants) {
        for (const key of Object.keys(row)) {
          if (key.trim().toLowerCase() === v.trim().toLowerCase()) {
            return row[key];
          }
        }
      }
      return '';
    }
    // Validate and map data to Project model fields
    const results = { created: 0, failed: 0, errors: [] };
    for (const row of data) {
      try {
        const project = new Project({
          drNumber: getField(row, 'DR Number', 'drnumber', 'dr number'),
          name: getField(row, 'Name', 'Project Name', 'project name'),
          projectManager: getField(row, 'Project Manager', 'projectmanager', 'project manager'),
          uiSPOCs: getField(row, 'UI SPOCS', 'ui spocs', 'ui spoc', 'ui_spocs') ? String(getField(row, 'UI SPOCS', 'ui spocs', 'ui spoc', 'ui_spocs')).split(',').map(s => s.trim()) : [],
          deliveryManager: getField(row, 'Delivery Manager', 'deliverymanager', 'delivery manager'),
          technology: getField(row, 'Technology', 'technology'),
          year: getField(row, 'Year', 'year') ? Number(getField(row, 'Year', 'year')) : undefined,
          region: getField(row, 'Region', 'region'),
          regionalSPOCLead: getField(row, 'Regional SPOC Lead', 'regional spoc lead', 'regionalspoclead'),
        });
        await project.save();
        results.created++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row, error: err.message });
      }
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Failed to process file', error: err.message });
  }
});

module.exports = router; 