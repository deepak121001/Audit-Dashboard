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

  // Helper for status badge
  const statusBadge = (status) => {
    const map = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
      'Completed': 'bg-green-100 text-green-800 border-green-200',
    };
    return `inline-block px-3 py-1 rounded-full text-xs font-semibold border ${map[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`;
  };
  // Helper for auditor avatar
  const auditorAvatar = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-10">
        <button onClick={() => navigate(-1)} className="mb-6 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded shadow-sm">&larr; Back</button>
        {/* Summary Card */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-gray-50 border border-gray-100 rounded-xl shadow-sm">
          <div>
            <div className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              {audit.project?.name || '-'}
              {audit.project?.drNumber && <span className="text-base text-gray-500 font-normal">({audit.project.drNumber})</span>}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-700 mt-1">
              <span>Quarter: <span className="font-semibold">{audit.quarter}</span></span>
              {audit.year && <span>Year: <span className="font-semibold">{audit.year}</span></span>}
              <span>Status: <span className={statusBadge(audit.status)}>{audit.status}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-200 text-blue-800 font-bold text-xl">
              {auditorAvatar(audit.assignedAuditor?.name)}
            </span>
            <div>
              <div className="font-semibold text-gray-900">{audit.assignedAuditor?.name || '-'}</div>
              <div className="text-xs text-gray-600">Auditor</div>
            </div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-blue-700">Progress</span>
            <span className="text-sm font-medium text-blue-700">{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-5">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
        {error && <div className="mb-4 text-red-500 font-medium">{error}</div>}
        {/* Steps Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm mb-8">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 z-10 bg-gray-100 border-b text-xs uppercase">
              <tr>
                <th className="p-2 border">Step</th>
                <th className="p-2 border text-center">Completed</th>
                <th className="p-2 border">Remarks</th>
                <th className="p-2 border text-center">Status</th>
                <th className="p-2 border">Reference URL</th>
                {canEdit() && <th className="p-2 border">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(optimisticSteps || audit.steps).map((step, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-2 border font-medium text-gray-900">{step.name}</td>
                  <td className="p-2 border text-center">
                    {canEdit() ? (
                      <input
                        type="checkbox"
                        checked={step.completed}
                        disabled={saving || auditorEditDisabled}
                        onChange={e => handleStepChange(idx, 'completed', e.target.checked)}
                        className="w-5 h-5 accent-green-600"
                      />
                    ) : (
                      step.completed ? <span title="Completed" className="inline-block w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span> : <span title="Incomplete" className="inline-block w-6 h-6 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></span>
                    )}
                  </td>
                  <td className="p-2 border">
                    {canEdit() ? (
                      <input
                        type="text"
                        value={step.remarks || ''}
                        disabled={saving || auditorEditDisabled}
                        onChange={e => handleStepChange(idx, 'remarks', e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Remarks"
                      />
                    ) : (
                      step.remarks || <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-2 border text-center">
                    {canEdit() ? (
                      <select
                        value={step.status || 'amber'}
                        disabled={saving || auditorEditDisabled}
                        onChange={e => handleStepChange(idx, 'status', e.target.value)}
                        className="p-2 rounded border"
                      >
                        <option value="red">🔴 Red</option>
                        <option value="amber">🟠 Amber</option>
                        <option value="green">🟢 Green</option>
                      </select>
                    ) : (
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${step.status === 'red' ? 'bg-red-100 text-red-700' : step.status === 'amber' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{step.status || 'amber'}</span>
                    )}
                  </td>
                  <td className="p-2 border">
                    {canEdit() ? (
                      <input
                        type="url"
                        value={step.referenceUrl || ''}
                        disabled={saving || auditorEditDisabled}
                        onChange={e => handleReferenceUrlChange(idx, e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Reference URL (https://...)"
                      />
                    ) : (
                      step.referenceUrl ? (
                        <a href={step.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Link</a>
                      ) : <span className="text-gray-400">-</span>
                    )}
                  </td>
                  {canEdit() && <td className="p-2 border text-xs text-gray-500">{step.completedAt ? new Date(step.completedAt).toLocaleString() : ''}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          {canMarkComplete() && (
            <button onClick={handleMarkComplete} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2 shadow">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Mark Audit as Completed
            </button>
          )}
          {canRequestEdit() && (
            <button onClick={handleRequestEdit} className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 flex items-center gap-2 shadow">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              Request Edit Access
            </button>
          )}
          {isAdmin && isCompleted && audit.editRequest && !audit.editEnabled && (
            <button onClick={handleApproveEdit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2 shadow">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Approve Edit Access
            </button>
          )}
          {isAdmin && isCompleted && (
            <button onClick={handleReopenAudit} className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex items-center gap-2 shadow">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M19.418 15A7.974 7.974 0 0012 8c-1.657 0-3.183.507-4.418 1.382M4.582 9A7.974 7.974 0 0112 16c1.657 0 3.183-.507 4.418-1.382" /></svg>
              Reopen Audit
            </button>
          )}
        </div>
        {/* Messages */}
        {completeMsg && <div className="mb-2 text-green-700 font-medium">{completeMsg}</div>}
        {editReqMsg && <div className="mb-2 text-yellow-700 font-medium">{editReqMsg}</div>}
        {approveMsg && <div className="mb-2 text-blue-700 font-medium">{approveMsg}</div>}
        {reopenMsg && <div className="mb-2 text-yellow-700 font-medium">{reopenMsg}</div>}
        {/* Audit History */}
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
        {/* Comments Section */}
        <div className="mt-8">
          <CommentsSection auditId={audit._id} />
        </div>
      </div>
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