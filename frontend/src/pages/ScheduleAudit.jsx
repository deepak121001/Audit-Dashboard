import React, { useEffect, useState } from 'react';
import axios from 'axios';

const defaultSteps = [
  { name: 'Code Checklist', completed: false, remarks: '' },
  { name: 'Elevated Tool Checklist', completed: false, remarks: '' },
  { name: 'Code Audit using the UI Insight Tool', completed: false, remarks: '' },
];

const ScheduleAudit = ({ onSuccess }) => {
  const [projects, setProjects] = useState([]);
  const [auditors, setAuditors] = useState([]);
  const [form, setForm] = useState({
    project: '',
    quarter: '',
    assignedAuditor: '',
    scheduledDate: '',
    steps: defaultSteps,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [projRes, userRes] = await Promise.all([
          axios.get('/api/projects', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/user', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setProjects(projRes.data);
        setAuditors(userRes.data.filter(u => u.role === 'Auditor'));
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch projects or auditors');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleStepChange = (idx, value) => {
    const steps = [...form.steps];
    steps[idx].name = value;
    setForm({ ...form, steps });
  };

  const handleAddStep = () => {
    setForm({ ...form, steps: [...form.steps, { name: '', completed: false, remarks: '' }] });
  };

  const handleRemoveStep = idx => {
    const steps = form.steps.filter((_, i) => i !== idx);
    setForm({ ...form, steps });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/audits', {
        project: form.project,
        quarter: form.quarter,
        assignedAuditor: form.assignedAuditor,
        scheduledDate: form.scheduledDate,
        steps: form.steps,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Audit scheduled successfully!');
      setForm({ project: '', quarter: '', assignedAuditor: '', scheduledDate: '', steps: defaultSteps });
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule audit');
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading projects and auditors...</div>;
  }

  return (
    <div className="p-6 bg-white rounded shadow max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Schedule New Audit</h2>
      {error && <div className="mb-2 text-red-500">{error}</div>}
      {success && <div className="mb-2 text-green-600">{success}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <select name="project" value={form.project} onChange={handleChange} required className="p-2 border rounded">
          <option value="">Select Project</option>
          {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select name="quarter" value={form.quarter} onChange={handleChange} required className="p-2 border rounded">
          <option value="">Select Quarter</option>
          <option value="Q1">Q1</option>
          <option value="Q2">Q2</option>
          <option value="Q3">Q3</option>
          <option value="Q4">Q4</option>
        </select>
        <select name="assignedAuditor" value={form.assignedAuditor} onChange={handleChange} required className="p-2 border rounded">
          <option value="">Select Auditor</option>
          {auditors.map(a => <option key={a._id} value={a._id}>{a.name} ({a.email})</option>)}
        </select>
        <input type="date" name="scheduledDate" value={form.scheduledDate} onChange={handleChange} required className="p-2 border rounded" />
        <div>
          <div className="font-semibold mb-2">Audit Steps</div>
          {form.steps.map((step, idx) => (
            <div key={idx} className="flex gap-2 mb-2 items-center">
              <input type="text" value={step.name} onChange={e => handleStepChange(idx, e.target.value)} className="p-2 border rounded flex-1" required />
              {form.steps.length > 1 && <button type="button" onClick={() => handleRemoveStep(idx)} className="text-red-500">Remove</button>}
            </div>
          ))}
          <button type="button" onClick={handleAddStep} className="text-blue-600 mt-1">+ Add Step</button>
        </div>
        <button type="submit" className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Schedule Audit</button>
      </form>
    </div>
  );
};

export default ScheduleAudit; 