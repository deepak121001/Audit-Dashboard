import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function getUser() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

const AuditDetails = () => {
  const { id } = useParams();
  const [audit, setAudit] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [completeMsg, setCompleteMsg] = useState('');
  const [editReqMsg, setEditReqMsg] = useState('');
  const [approveMsg, setApproveMsg] = useState('');
  const [reopenMsg, setReopenMsg] = useState('');
  const [optimisticSteps, setOptimisticSteps] = useState(null);
  const user = getUser();
  const navigate = useNavigate();

  const fetchAudit = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/audits/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setAudit(res.data);
      setOptimisticSteps(null);
    } catch (err) {
      setError('Failed to fetch audit');
    }
  };

  useEffect(() => {
    fetchAudit();
    // eslint-disable-next-line
  }, [id]);

  const isAuditor = audit && audit.assignedAuditor && audit.assignedAuditor._id === user.userId;
  const isAdmin = user && user.role === 'Admin';
  const isCompleted = audit && audit.status === 'Completed';
  const canEdit = () => {
    if (!user || !audit) return false;
    if (isAdmin) return true;
    if (isAuditor) {
      if (!isCompleted) return true;
      if (audit.editEnabled) return true;
      return false;
    }
    return false;
  };

  const canMarkComplete = () => {
    if (!user || !audit) return false;
    if (audit.status === 'Completed') return false;
    const isAuditor = audit.assignedAuditor && audit.assignedAuditor._id === user.userId;
    return (user.role === 'Admin' || isAuditor) && audit.steps.every(s => s.completed);
  };

  const canRequestEdit = () => {
    if (!user || !audit) return false;
    if (audit.status !== 'Completed' || audit.editRequest) return false;
    return audit.assignedAuditor && audit.assignedAuditor._id === user.userId;
  };

  const handleStepChange = async (idx, field, value) => {
    setSaving(true);
    setError('');
    const prevSteps = (optimisticSteps || audit.steps).map(s => ({ ...s }));
    const oldStep = { ...prevSteps[idx] };
    prevSteps[idx][field] = value;
    setOptimisticSteps(prevSteps);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/audits/${id}/steps/${idx}`, { [field]: value }, { headers: { Authorization: `Bearer ${token}` } });
      fetchAudit();
    } catch (err) {
      const reverted = (optimisticSteps || audit.steps).map(s => ({ ...s }));
      reverted[idx] = oldStep;
      setOptimisticSteps(reverted);
      setError(err.response?.data?.message || 'Failed to update step');
    }
    setSaving(false);
  };

  const handleMarkComplete = async () => {
    setCompleteMsg('');
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/audits/${audit._id}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompleteMsg('Audit marked as completed!');
      fetchAudit();
    } catch (err) {
      setCompleteMsg(err.response?.data?.message || 'Failed to mark as completed');
    }
  };

  const handleRequestEdit = async () => {
    setEditReqMsg('');
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/audits/${audit._id}/request-edit`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditReqMsg('Edit request sent to Admin.');
      fetchAudit();
    } catch (err) {
      setEditReqMsg(err.response?.data?.message || 'Failed to send edit request');
    }
  };

  const handleApproveEdit = async () => {
    setApproveMsg('');
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/audits/${audit._id}/approve-edit`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApproveMsg('Edit access granted to auditor.');
      fetchAudit();
    } catch (err) {
      setApproveMsg(err.response?.data?.message || 'Failed to approve edit access');
    }
  };

  const handleReopenAudit = async () => {
    setReopenMsg('');
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/audits/${audit._id}/reopen`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReopenMsg('Audit has been reopened and set to Pending.');
      fetchAudit();
    } catch (err) {
      setReopenMsg(err.response?.data?.message || 'Failed to reopen audit');
    }
  };

  const handleReferenceUrlChange = (idx, value) => {
    handleStepChange(idx, 'referenceUrl', value);
  };

  // Helper for disabling auditor editing
  const auditorEditDisabled = isAuditor && isCompleted && !audit.editEnabled;

  if (!audit) return <div className="p-8">Loading...</div>;

  // Calculate progress
  const totalSteps = audit.steps.length;
  const completedSteps = audit.steps.filter(s => s.completed).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <button onClick={() => navigate(-1)} className="mb-4 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded">&larr; Back</button>
      {/* Edit request status UI for Auditor on completed audits - now at the top */}
      {isCompleted && isAuditor && !audit.editEnabled && (
        <div className="flex justify-center mb-6">
          {audit.editRequest ? (
            <div className="w-full max-w-md bg-yellow-50 border border-yellow-200 shadow-lg rounded-xl p-6 flex items-center gap-4 animate-fade-in">
              <div className="flex-shrink-0">
                <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="#FEF3C7"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" stroke="#F59E42" strokeWidth="2"/><circle cx="12" cy="12" r="9" stroke="#FDE68A" strokeWidth="1"/></svg>
              </div>
              <div>
                <div className="font-bold text-yellow-800 text-lg mb-1">Edit Access Requested</div>
                <div className="text-yellow-700">Waiting for admin approval. You will be able to edit once approved.</div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md bg-gray-50 border border-gray-200 shadow-lg rounded-xl p-6 flex items-center gap-4 animate-fade-in">
              <div className="flex-shrink-0">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="9" rx="2" fill="#F3F4F6"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm6-10V7a4 4 0 10-8 0v2" stroke="#9CA3AF" strokeWidth="2"/></svg>
              </div>
              <div>
                <div className="font-bold text-gray-700 text-lg mb-1">Read-Only Audit</div>
                <div className="text-gray-500">This audit is read-only. You can request edit access if changes are needed.</div>
              </div>
            </div>
          )}
        </div>
      )}
      <h2 className="text-2xl font-bold mb-4">Audit Details</h2>
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-blue-700">Progress</span>
          <span className="text-sm font-medium text-blue-700">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div className="bg-blue-600 h-4 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>
      <div className="mb-2"><b>Project:</b> {audit.project ? `${audit.project.name}${audit.project.drNumber ? ` (${audit.project.drNumber})` : ''}` : '-'}</div>
      <div className="mb-2"><b>Quarter:</b> {audit.quarter}</div>
      <div className="mb-2"><b>Assigned Auditor:</b> {audit.assignedAuditor?.name}</div>
      <div className="mb-2"><b>Status:</b> {audit.status}</div>
      {error && <div className="mb-4 text-red-500">{error}</div>}
      <table className="w-full border mt-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Step</th>
            <th className="p-2 border">Completed</th>
            <th className="p-2 border">Remarks</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Reference URL</th>
            {canEdit() && <th className="p-2 border">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {(optimisticSteps || audit.steps).map((step, idx) => (
            <tr key={idx}>
              <td className="p-2 border">{step.name}</td>
              <td className="p-2 border text-center">
                {canEdit() ? (
                  <input
                    type="checkbox"
                    checked={step.completed}
                    disabled={saving || auditorEditDisabled}
                    onChange={e => handleStepChange(idx, 'completed', e.target.checked)}
                  />
                ) : (
                  step.completed ? '✅' : '❌'
                )}
              </td>
              <td className="p-2 border">
                {canEdit() ? (
                  <input
                    type="text"
                    value={step.remarks || ''}
                    disabled={saving || auditorEditDisabled}
                    onChange={e => handleStepChange(idx, 'remarks', e.target.value)}
                    className="w-full p-1 border rounded"
                  />
                ) : (
                  step.remarks || '-'
                )}
              </td>
              <td className="p-2 border text-center">
                {canEdit() ? (
                  <select
                    value={step.status || 'amber'}
                    disabled={saving || auditorEditDisabled}
                    onChange={e => handleStepChange(idx, 'status', e.target.value)}
                    className="p-1 rounded border"
                  >
                    <option value="red">🔴 Red</option>
                    <option value="amber">🟠 Amber</option>
                    <option value="green">🟢 Green</option>
                  </select>
                ) : (
                  <span>
                    {step.status === 'red' && <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1 align-middle"></span>}
                    {step.status === 'amber' && <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-1 align-middle"></span>}
                    {step.status === 'green' && <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1 align-middle"></span>}
                    <span className="capitalize">{step.status || 'amber'}</span>
                  </span>
                )}
              </td>
              <td className="p-2 border">
                {canEdit() ? (
                  <input
                    type="url"
                    value={step.referenceUrl || ''}
                    disabled={saving || auditorEditDisabled}
                    onChange={e => handleReferenceUrlChange(idx, e.target.value)}
                    className="w-full p-1 border rounded"
                    placeholder="https://..."
                  />
                ) : (
                  step.referenceUrl ? (
                    <a href={step.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Link</a>
                  ) : '-'
                )}
              </td>
              {canEdit() && <td className="p-2 border">{step.completedAt ? new Date(step.completedAt).toLocaleString() : ''}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Audit History (Step Changes)</h3>
        <ul className="bg-gray-50 p-4 rounded border">
          {audit.steps.map((step, idx) => (
            <li key={idx} className="mb-2 text-sm">
              <b>{step.name}:</b> {step.completed ? 'Completed' : 'Incomplete'}
              {step.completedAt && (
                <> (at {new Date(step.completedAt).toLocaleString()})</>
              )}
              {step.remarks && (
                <> — Remark: <span className="italic">{step.remarks}</span></>
              )}
            </li>
          ))}
        </ul>
      </div>
      <CommentsSection auditId={audit._id} />
      {canMarkComplete() && (
        <button onClick={handleMarkComplete} className="mt-6 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Mark Audit as Completed</button>
      )}
      {completeMsg && <div className="mt-2 text-green-700">{completeMsg}</div>}
      {canRequestEdit() && (
        <button onClick={handleRequestEdit} className="mt-6 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">Request Edit Access</button>
      )}
      {editReqMsg && <div className="mt-2 text-yellow-700">{editReqMsg}</div>}
      {isAdmin && isCompleted && audit.editRequest && !audit.editEnabled && (
        <button onClick={handleApproveEdit} className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Approve Edit Access</button>
      )}
      {approveMsg && <div className="mt-2 text-blue-700">{approveMsg}</div>}
      {isAdmin && isCompleted && (
        <button onClick={handleReopenAudit} className="mb-4 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">Reopen Audit</button>
      )}
      {reopenMsg && <div className="mb-2 text-yellow-700">{reopenMsg}</div>}
    </div>
  );
};

function CommentsSection({ auditId }) {
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState('');
  const user = getUser();
  const [audit, setAudit] = useState(null);

  useEffect(() => {
    axios.get(`/api/audits/${auditId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => setAudit(res.data));
  }, [auditId]);

  const isAuditor = user && audit && audit.assignedAuditor && audit.assignedAuditor._id === user.userId;
  const isCompleted = audit && audit.status === 'Completed';
  const auditorEditDisabled = isAuditor && isCompleted && !audit.editEnabled;

  const handleAdd = () => {
    if (!input.trim()) return;
    setComments([...comments, { user: user?.name || 'User', text: input, date: new Date() }]);
    setInput('');
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-2">Comments</h3>
      <div className="bg-gray-50 p-4 rounded border mb-2">
        {comments.length === 0 && <div className="text-gray-400">No comments yet.</div>}
        {comments.map((c, i) => (
          <div key={i} className="mb-2 text-sm">
            <b>{c.user}</b> <span className="text-gray-500">({new Date(c.date).toLocaleString()})</span>: {c.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 p-2 border rounded"
          placeholder="Add a comment..."
          disabled={auditorEditDisabled}
        />
        <button onClick={handleAdd} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700" disabled={auditorEditDisabled}>Add</button>
      </div>
    </div>
  );
}

export default AuditDetails; 