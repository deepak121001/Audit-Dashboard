const cron = require('node-cron');
const Audit = require('../models/Audit');
const User = require('../models/User');
const Project = require('../models/Project');
const { sendEmail } = require('./email');

// Run every day at 8am
cron.schedule('0 8 * * *', async () => {
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const soon = new Date(now.getTime() + oneDay);
  const recent = new Date(now.getTime() - oneDay);

  // Find audits scheduled for tomorrow (reminder before)
  const upcoming = await Audit.find({ scheduledDate: { $gte: now, $lt: soon } }).populate('project').populate('assignedAuditor');
  // Find audits scheduled for yesterday (reminder after)
  const past = await Audit.find({ scheduledDate: { $gte: recent, $lt: now } }).populate('project').populate('assignedAuditor');

  for (const audit of [...upcoming, ...past]) {
    const emails = [];
    if (audit.assignedAuditor?.email) emails.push(audit.assignedAuditor.email);
    if (audit.project) {
      if (audit.project.projectManager && audit.project.projectManager.includes('@')) emails.push(audit.project.projectManager);
      if (Array.isArray(audit.project.uiSPOCs)) {
        audit.project.uiSPOCs.forEach(spoc => {
          if (spoc && spoc.includes('@')) emails.push(spoc);
        });
      }
    }
    if (emails.length > 0) {
      await sendEmail({
        to: emails.join(','),
        subject: `Audit Reminder: ${audit.project?.name || ''}`,
        text: `This is a reminder for the audit of project ${audit.project?.name || ''} scheduled on ${audit.scheduledDate?.toLocaleString()}.`,
      });
    }
  }
}); 