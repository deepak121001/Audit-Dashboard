const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  name: String,
  completed: { type: Boolean, default: false },
  remarks: String,
  completedAt: Date,
  status: { type: String, enum: ['red', 'amber', 'green'], default: 'amber' },
  referenceUrl: String,
});

const auditSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  quarter: { type: String, required: true },
  assignedAuditor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  steps: [stepSchema],
  remarks: String,
  scheduledDate: Date,
  stakeholders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  stakeholderEmails: [{ type: String }],
  editRequest: { type: Boolean, default: false },
  editEnabled: { type: Boolean, default: false },
  year: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Audit', auditSchema); 