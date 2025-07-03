const express = require('express');
const Audit = require('../models/Audit');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const { sendEmail } = require('../utils/email');
const User = require('../models/User');
const Project = require('../models/Project');
const router = express.Router();

// Require auth for all routes
router.use(auth);

// Get all audits
router.get('/', async (req, res) => {
  try {
    let audits;
    if (req.user.role === 'Auditor') {
      audits = await Audit.find({ assignedAuditor: req.user.userId })
        .populate('project')
        .populate('assignedAuditor')
        .populate('stakeholders');
    } else {
      audits = await Audit.find()
        .populate('project')
        .populate('assignedAuditor')
        .populate('stakeholders');
    }
    res.json(audits);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new audit (Admin only)
router.post('/', roles('Admin'), async (req, res) => {
  try {
    // Prevent duplicate open audits for the same project
    const existing = await Audit.findOne({
      project: req.body.project,
      status: { $ne: 'Completed' }
    });
    if (existing) {
      return res.status(400).json({ message: 'An audit for this project is already planned and not completed.' });
    }
    const audit = new Audit(req.body);
    await audit.save();
    // Send email notifications
    const populatedAudit = await Audit.findById(audit._id).populate('project').populate('assignedAuditor');
    const emails = [];
    // Assigned auditor
    if (populatedAudit.assignedAuditor?.email) emails.push(populatedAudit.assignedAuditor.email);
    // Project manager and UI SPOCs (if they are emails, otherwise skip or use placeholder)
    if (populatedAudit.project) {
      // If projectManager is an email, add it
      if (populatedAudit.project.projectManager && populatedAudit.project.projectManager.includes('@')) {
        emails.push(populatedAudit.project.projectManager);
      }
      // If uiSPOCs are emails, add them
      if (Array.isArray(populatedAudit.project.uiSPOCs)) {
        populatedAudit.project.uiSPOCs.forEach(spoc => {
          if (spoc && spoc.includes('@')) emails.push(spoc);
        });
      }
    }
    if (emails.length > 0) {
      await sendEmail({
        to: emails.join(','),
        subject: `Audit Scheduled for Project: ${populatedAudit.project?.name || ''}`,
        text: `An audit has been scheduled for project ${populatedAudit.project?.name || ''} in quarter ${populatedAudit.quarter}. Assigned Auditor: ${populatedAudit.assignedAuditor?.name || ''}.`,
      });
    }
    res.status(201).json(audit);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get an audit by ID
router.get('/:id', async (req, res) => {
  try {
    const audit = await Audit.findById(req.params.id).populate('project').populate('assignedAuditor').populate('stakeholders');
    if (!audit) return res.status(404).json({ message: 'Audit not found' });
    res.json(audit);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an audit (Admin or Auditor)
router.put('/:id', roles('Admin', 'Auditor'), async (req, res) => {
  try {
    const audit = await Audit.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!audit) return res.status(404).json({ message: 'Audit not found' });
    res.json(audit);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete an audit (Admin only)
router.delete('/:id', roles('Admin'), async (req, res) => {
  try {
    const audit = await Audit.findByIdAndDelete(req.params.id);
    if (!audit) return res.status(404).json({ message: 'Audit not found' });
    res.json({ message: 'Audit deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a specific step's completion and remarks (Admin or assigned Auditor)
router.patch('/:id/steps/:stepIndex', roles('Admin', 'Auditor'), async (req, res) => {
  try {
    const audit = await Audit.findById(req.params.id);
    if (!audit) return res.status(404).json({ message: 'Audit not found' });
    // Only assigned auditor or admin can update
    if (
      req.user.role !== 'Admin' &&
      (!audit.assignedAuditor || audit.assignedAuditor.toString() !== req.user.userId)
    ) {
      return res.status(403).json({ message: 'Forbidden: not assigned auditor' });
    }
    // Prevent auditors from editing if audit is completed and editEnabled is not true
    if (
      req.user.role === 'Auditor' &&
      audit.status === 'Completed' &&
      !audit.editEnabled
    ) {
      return res.status(403).json({ message: 'Audit is completed. Edit access not granted.' });
    }
    const idx = parseInt(req.params.stepIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= audit.steps.length) {
      return res.status(400).json({ message: 'Invalid step index' });
    }
    if (typeof req.body.completed === 'boolean') {
      audit.steps[idx].completed = req.body.completed;
      audit.steps[idx].completedAt = req.body.completed ? new Date() : null;
    }
    if (typeof req.body.remarks === 'string') {
      audit.steps[idx].remarks = req.body.remarks;
    }
    if (typeof req.body.status === 'string' && ['red', 'amber', 'green'].includes(req.body.status)) {
      audit.steps[idx].status = req.body.status;
    }
    await audit.save();
    res.json(audit);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Resend notification email for an audit (Admin only)
router.post('/:id/resend-notification', roles('Admin'), async (req, res) => {
  try {
    const audit = await Audit.findById(req.params.id).populate('project').populate('assignedAuditor');
    if (!audit) return res.status(404).json({ message: 'Audit not found' });
    if (audit.status === 'Completed') return res.status(400).json({ message: 'Audit already completed.' });
    const emails = [];
    if (audit.assignedAuditor?.email) emails.push(audit.assignedAuditor.email);
    if (audit.project) {
      if (audit.project.projectManager && audit.project.projectManager.includes('@')) {
        emails.push(audit.project.projectManager);
      }
      if (Array.isArray(audit.project.uiSPOCs)) {
        audit.project.uiSPOCs.forEach(spoc => {
          if (spoc && spoc.includes('@')) emails.push(spoc);
        });
      }
    }
    if (emails.length > 0) {
      await sendEmail({
        to: emails.join(','),
        subject: `Audit Reminder for Project: ${audit.project?.name || ''}`,
        text: `This is a reminder for the audit of project ${audit.project?.name || ''} in quarter ${audit.quarter}. Assigned Auditor: ${audit.assignedAuditor?.name || ''}.`,
      });
    }
    res.json({ message: 'Notification sent' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Mark audit as completed (Admin or assigned Auditor)
router.patch('/:id/complete', roles('Admin', 'Auditor'), async (req, res) => {
  try {
    const audit = await Audit.findById(req.params.id);
    if (!audit) return res.status(404).json({ message: 'Audit not found' });
    if (audit.status === 'Completed') return res.status(400).json({ message: 'Audit already completed.' });
    // Only assigned auditor or admin can complete
    if (
      req.user.role !== 'Admin' &&
      (!audit.assignedAuditor || audit.assignedAuditor.toString() !== req.user.userId)
    ) {
      return res.status(403).json({ message: 'Forbidden: not assigned auditor' });
    }
    // All steps must be completed
    if (!audit.steps.every(s => s.completed)) {
      return res.status(400).json({ message: 'All steps must be completed before marking audit as completed.' });
    }
    audit.status = 'Completed';
    audit.editRequest = false;
    audit.editEnabled = false;
    await audit.save();
    res.json({ message: 'Audit marked as completed', audit });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Request edit access for a completed audit (assigned Auditor only)
router.patch('/:id/request-edit', roles('Auditor'), async (req, res) => {
  try {
    const audit = await Audit.findById(req.params.id);
    if (!audit) return res.status(404).json({ message: 'Audit not found' });
    if (audit.status !== 'Completed') return res.status(400).json({ message: 'Audit is not completed.' });
    if (!audit.assignedAuditor || audit.assignedAuditor.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden: not assigned auditor' });
    }
    if (audit.editRequest) return res.status(400).json({ message: 'Edit request already sent.' });
    audit.editRequest = true;
    await audit.save();
    // Optionally, notify Admin here (e.g., via email)
    res.json({ message: 'Edit request sent to Admin.' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Approve edit access for a completed audit (Admin only)
router.patch('/:id/approve-edit', roles('Admin'), async (req, res) => {
  try {
    const audit = await Audit.findById(req.params.id);
    if (!audit) return res.status(404).json({ message: 'Audit not found' });
    if (audit.status !== 'Completed') return res.status(400).json({ message: 'Audit is not completed.' });
    audit.editEnabled = true;
    audit.editRequest = false;
    audit.status = 'Pending';
    await audit.save();
    res.json({ message: 'Edit access granted to auditor.', audit });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Reopen a completed audit (Admin only)
router.patch('/:id/reopen', roles('Admin'), async (req, res) => {
  try {
    const audit = await Audit.findById(req.params.id);
    if (!audit) return res.status(404).json({ message: 'Audit not found' });
    if (audit.status !== 'Completed') return res.status(400).json({ message: 'Only completed audits can be reopened.' });
    audit.status = 'Pending';
    audit.editRequest = false;
    audit.editEnabled = false;
    await audit.save();
    res.json({ message: 'Audit reopened and set to Pending.', audit });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Request an audit (Admin only)
router.post('/request', roles('Admin'), async (req, res) => {
  try {
    const { project, assignedAuditor, quarter, steps, year } = req.body;
    // Prevent duplicate open audits for the same project
    const existing = await Audit.findOne({ project, status: { $ne: 'Completed' } });
    if (existing) {
      return res.status(400).json({ message: 'An audit for this project is already planned and not completed.' });
    }
    // Find project and possible stakeholders
    const projectObj = await Project.findById(project);
    let stakeholders = [];
    let stakeholderEmails = [];
    if (projectObj) {
      const emails = [];
      if (Array.isArray(projectObj.uiSPOCs)) emails.push(...projectObj.uiSPOCs);
      if (projectObj.deliveryManager && projectObj.deliveryManager.includes('@')) emails.push(projectObj.deliveryManager);
      // Find users with these emails
      const users = await User.find({ email: { $in: emails } });
      stakeholders = users.map(u => u._id);
      stakeholderEmails = emails;
    }
    // Use provided steps or default
    const defaultSteps = [
      { name: 'Checklist', completed: false, remarks: '', status: 'amber' },
      { name: 'Elevated Checklist', completed: false, remarks: '', status: 'amber' },
      { name: 'Deep Audit', completed: false, remarks: '', status: 'amber' },
    ];

    const audit = new Audit({
      project,
      assignedAuditor,
      quarter,
      year: year ? Number(year) : (projectObj?.year || undefined),
      status: 'Pending',
      steps: Array.isArray(steps) && steps.length > 0 ? steps : defaultSteps,
      stakeholders,
      stakeholderEmails,
    });
    await audit.save();
    // Email auditor
    const auditor = await User.findById(assignedAuditor);
    if (auditor?.email) {
      await sendEmail({
        to: auditor.email,
        subject: `Audit Requested for Project: ${projectObj?.name || ''}`,
        text: `You have been requested to perform an audit for project ${projectObj?.name || ''} (Quarter: ${quarter}). Please log in to schedule the audit.`
      });
    }
    res.status(201).json(audit);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Auditor schedules the audit meeting (Auditor only)
router.post('/:id/schedule', roles('Auditor'), async (req, res) => {
  try {
    const { scheduledDate } = req.body;
    const audit = await Audit.findById(req.params.id).populate('project');
    if (!audit) return res.status(404).json({ message: 'Audit not found' });
    if (!audit.assignedAuditor || audit.assignedAuditor.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden: not assigned auditor' });
    }
    audit.scheduledDate = scheduledDate;
    audit.status = 'In Progress';
    await audit.save();
    // Email UI SPOCs and Delivery Manager
    const emails = [];
    if (audit.project) {
      if (Array.isArray(audit.project.uiSPOCs)) {
        audit.project.uiSPOCs.forEach(spoc => { if (spoc && spoc.includes('@')) emails.push(spoc); });
      }
      if (audit.project.deliveryManager && audit.project.deliveryManager.includes('@')) {
        emails.push(audit.project.deliveryManager);
      }
    }
    if (emails.length > 0) {
      await sendEmail({
        to: emails.join(','),
        subject: `Audit Meeting Scheduled for Project: ${audit.project?.name || ''}`,
        text: `An audit meeting has been scheduled for project ${audit.project?.name || ''} on ${scheduledDate}. Please be available.`
      });
    }
    res.json(audit);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router; 