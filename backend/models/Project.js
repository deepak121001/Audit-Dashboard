const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  drNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  region: { type: String },
  projectManager: { type: String },
  uiSPOCs: [{ type: String }],
  deliveryManager: { type: String },
  auditorName: { type: String },
  regionalSPOCLead: { type: String },
  technology: { type: String },
  year: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema); 