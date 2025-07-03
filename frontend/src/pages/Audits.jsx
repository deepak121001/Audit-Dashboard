import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import ScheduleAudit from './ScheduleAudit';

// Default audit steps (should match ScheduleAudit.jsx)
const defaultSteps = [
  { name: 'Checklist', completed: false, remarks: '', status: 'amber' },
  { name: 'Elevated Checklist', completed: false, remarks: '', status: 'amber' },
  { name: 'Deep Audit', completed: false, remarks: '', status: 'amber' },
];

function getUserRole() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role;
  } catch {
    return null;
  }
}

function getUserId() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
  } catch {
    return null;
  }
}

const fetchWithToken = async (url, method = 'get', data = null) => {
  const token = localStorage.getItem('token');
  return axios({
    url,
    method,
    data,
    headers: { Authorization: `Bearer ${token}` },
  });
};

const Audits = () => {
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');
  const role = getUserRole();
  const userId = getUserId();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ project: '', assignedAuditor: '', quarter: '', year: '' });
  const [projects, setProjects] = useState([]);
  const [auditors, setAuditors] = useState([]);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleAuditId, setScheduleAuditId] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [inlineRequest, setInlineRequest] = useState({});
  const [inlineRequestStatus, setInlineRequestStatus] = useState({});
  const [loadingActions, setLoadingActions] = useState({});

  const fetchAudits = async () => {
    try {
      const res = await fetchWithToken('/api/audits');
      setAudits(res.data);
    } catch (err) {
      setError('Failed to fetch audits');
    }
  };

  const fetchProjectsAndAuditors = async () => {
    try {
      const [projRes, userRes] = await Promise.all([
        fetchWithToken('/api/projects'),
        fetchWithToken('/api/user'),
      ]);
      setProjects(projRes.data);
      setAuditors(userRes.data.filter(u => u.role === 'Auditor'));
    } catch {}
  };

  useEffect(() => {
    fetchAudits();
    if (role === 'Admin') fetchProjectsAndAuditors();
  }, []);

  const openRequestModal = () => {
    setRequestForm({ project: '', assignedAuditor: '', quarter: '', year: '' });
    setRequestError('');
    setRequestSuccess('');
    setShowRequestModal(true);
  };
  const closeRequestModal = () => setShowRequestModal(false);
  const handleRequestChange = e => setRequestForm({ ...requestForm, [e.target.name]: e.target.value });
  const handleRequestSubmit = async e => {
    e.preventDefault();
    setRequestError('');
    setRequestSuccess('');
    setLoadingActions(prev => ({ ...prev, requestModal: true }));
    try {
      await fetchWithToken('/api/audits/request', 'post', { ...requestForm, steps: defaultSteps.map(s => ({ ...s })) });
      setRequestSuccess('Audit requested successfully!');
      fetchAudits();
    } catch (err) {
      setRequestError(err.response?.data?.message || 'Failed to request audit');
    }
    setLoadingActions(prev => ({ ...prev, requestModal: false }));
  };

  const openScheduleModal = (auditId) => {
    setScheduleAuditId(auditId);
    setScheduleDate('');
    setScheduleError('');
    setScheduleSuccess('');
    setShowScheduleModal(true);
  };
  const closeScheduleModal = () => setShowScheduleModal(false);
  const handleScheduleSubmit = async e => {
    e.preventDefault();
    setScheduleError('');
    setScheduleSuccess('');
    setLoadingActions(prev => ({ ...prev, schedule: true }));
    try {
      await fetchWithToken(`/api/audits/${scheduleAuditId}/schedule`, 'post', { scheduledDate: scheduleDate });
      setScheduleSuccess('Audit meeting scheduled!');
      fetchAudits();
    } catch (err) {
      setScheduleError(err.response?.data?.message || 'Failed to schedule meeting');
    }
    setLoadingActions(prev => ({ ...prev, schedule: false }));
  };

  const handleResendNotification = async (id) => {
    setNotifMsg('');
    setLoadingActions(prev => ({ ...prev, ['resend_' + id]: true }));
    try {
      await fetchWithToken(`/api/audits/${id}/resend-notification`, 'post');
      setNotifMsg('Notification sent!');
    } catch (err) {
      setNotifMsg(err.response?.data?.message || 'Failed to send notification');
    }
    setLoadingActions(prev => ({ ...prev, ['resend_' + id]: false }));
  };

  const handleReopenAudit = async (id) => {
    setNotifMsg('');
    setLoadingActions(prev => ({ ...prev, ['reopen_' + id]: true }));
    try {
      await fetchWithToken(`/api/audits/${id}/reopen`, 'patch');
      setNotifMsg('Audit has been reopened and set to Pending.');
      fetchAudits();
    } catch (err) {
      setNotifMsg(err.response?.data?.message || 'Failed to reopen audit');
    }
    setLoadingActions(prev => ({ ...prev, ['reopen_' + id]: false }));
  };

  const handleInlineRequestChange = (projectId, field, value) => {
    setInlineRequest(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [field]: value
      }
    }));
  };

  const handleInlineRequestSubmit = async (projectId) => {
    setInlineRequestStatus(prev => ({ ...prev, [projectId]: { error: '', success: '' } }));
    setLoadingActions(prev => ({ ...prev, ['inlineRequest_' + projectId]: true }));
    const req = inlineRequest[projectId] || {};
    if (!req.assignedAuditor || !req.quarter) {
      setInlineRequestStatus(prev => ({ ...prev, [projectId]: { error: 'Select auditor and quarter', success: '' } }));
      setLoadingActions(prev => ({ ...prev, ['inlineRequest_' + projectId]: false }));
      return;
    }
    try {
      await fetchWithToken('/api/audits/request', 'post', {
        project: projectId,
        assignedAuditor: req.assignedAuditor,
        quarter: req.quarter,
        year: req.year,
        steps: defaultSteps.map(s => ({ ...s })),
      });
      setInlineRequestStatus(prev => ({ ...prev, [projectId]: { error: '', success: 'Audit requested!' } }));
      fetchAudits();
    } catch (err) {
      setInlineRequestStatus(prev => ({ ...prev, [projectId]: { error: err.response?.data?.message || 'Failed to request audit', success: '' } }));
    }
    setLoadingActions(prev => ({ ...prev, ['inlineRequest_' + projectId]: false }));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Audits</h2>
      {role === 'Admin' && (
        <button onClick={openRequestModal} className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Request Audit</button>
      )}
      {error && <div className="mb-4 text-red-500">{error}</div>}
      {notifMsg && <div className="mb-2 text-green-600">{notifMsg}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full border bg-white rounded shadow text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-3 border">Project</th>
              <th className="py-2 px-3 border">Quarter</th>
              <th className="py-2 px-3 border w-32">Assigned Auditor</th>
              <th className="py-2 px-3 border">Status</th>
              <th className="py-2 px-3 border">Project Health</th>
              <th className="py-2 px-3 border">UI SPOCS</th>
              <th className="py-2 px-3 border">Delivery Manager</th>
              <th className="py-2 px-3 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {role === 'Admin'
              ? projects.map((project) => {
                  const projectAudits = audits.filter(a => a.project && a.project._id === project._id);
                  const a = projectAudits.length > 0 ? projectAudits[0] : null;
                  return (
                    <AuditTableRow
                      key={project._id}
                      project={project}
                      audits={audits}
                      auditors={auditors}
                      inlineRequest={inlineRequest}
                      inlineRequestStatus={inlineRequestStatus}
                      loadingActions={loadingActions}
                      handleInlineRequestChange={handleInlineRequestChange}
                      handleInlineRequestSubmit={handleInlineRequestSubmit}
                      handleResendNotification={handleResendNotification}
                      handleReopenAudit={handleReopenAudit}
                      userId={userId}
                      role={role}
                      openScheduleModal={openScheduleModal}
                    />
                  );
                })
              : audits.map((a) => (
                  <tr key={a._id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 border align-middle">{a.project?.name || '-'}</td>
                    <td className="py-2 px-3 border align-middle">{a.quarter}{a.year ? ` ${a.year}` : ''}</td>
                    <td className="py-2 px-3 border w-32 align-middle">{a.assignedAuditor?.name || '-'}</td>
                    <td className="py-2 px-3 border align-middle">{a.status}</td>
                    <td className="py-2 px-3 border align-middle">
                      <ProjectHealthStatus steps={a?.steps} />
                    </td>
                    <td className="py-2 px-3 border align-middle">{Array.isArray(a.project?.uiSPOCs) ? a.project.uiSPOCs.join(', ') : '-'}</td>
                    <td className="py-2 px-3 border align-middle">{a.project?.deliveryManager || '-'}</td>
                    <td className="py-2 px-3 border align-middle flex gap-2">
                      <Link
                        to={`/audits/${a._id}`}
                        className="relative group bg-blue-600 hover:bg-blue-700 text-white rounded-full w-9 h-9 flex items-center justify-center"
                        aria-label="View Details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">View Details</span>
                      </Link>
                      {role === 'Auditor' && a.assignedAuditor?._id === userId && a.status === 'Pending' && !a.scheduledDate && (
                        <button
                          onClick={() => openScheduleModal(a._id)}
                          className="relative group bg-green-600 hover:bg-green-700 text-white rounded-full w-9 h-9 flex items-center justify-center"
                          aria-label="Schedule Meeting"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">Schedule Meeting</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {showRequestModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg relative">
            <button onClick={closeRequestModal} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">&times;</button>
            <h3 className="text-xl font-bold mb-4">Request Audit</h3>
            <form onSubmit={handleRequestSubmit} className="flex flex-col gap-3">
              <select name="project" value={requestForm.project} onChange={handleRequestChange} required className="p-2 border rounded">
                <option value="">Select Project</option>
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              <select name="year" value={requestForm.year} onChange={handleRequestChange} required className="p-2 border rounded">
                <option value="">Select Year</option>
                {[...new Set(projects.map(p => p.year).filter(Boolean))].sort((a, b) => b - a).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select name="assignedAuditor" value={requestForm.assignedAuditor} onChange={handleRequestChange} required className="p-2 border rounded">
                <option value="">Select Auditor</option>
                {auditors.map(a => <option key={a._id} value={a._id}>{a.name} ({a.email})</option>)}
              </select>
              <select name="quarter" value={requestForm.quarter} onChange={handleRequestChange} required className="p-2 border rounded">
                <option value="">Select Quarter</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60" disabled={loadingActions.requestModal}>
                {loadingActions.requestModal ? 'Loading...' : 'Request'}
              </button>
            </form>
            {requestError && <div className="mt-2 text-red-500">{requestError}</div>}
            {requestSuccess && <div className="mt-2 text-green-600">{requestSuccess}</div>}
          </div>
        </div>
      )}
      {showScheduleModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg relative">
            <button onClick={closeScheduleModal} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">&times;</button>
            <h3 className="text-xl font-bold mb-4">Schedule Audit Meeting</h3>
            <form onSubmit={handleScheduleSubmit} className="flex flex-col gap-3">
              <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} required className="p-2 border rounded" />
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-60" disabled={loadingActions.schedule}>
                {loadingActions.schedule ? 'Loading...' : 'Schedule'}
              </button>
            </form>
            {scheduleError && <div className="mt-2 text-red-500">{scheduleError}</div>}
            {scheduleSuccess && <div className="mt-2 text-green-600">{scheduleSuccess}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

// Table row component for Admin view
function AuditTableRow({
  project,
  audits,
  auditors,
  inlineRequest,
  inlineRequestStatus,
  loadingActions,
  handleInlineRequestChange,
  handleInlineRequestSubmit,
  handleResendNotification,
  handleReopenAudit,
  userId,
  role,
  openScheduleModal
}) {
  const projectAudits = audits.filter(a => a.project && a.project._id === project._id);
  const a = projectAudits.length > 0 ? projectAudits[0] : null;
  return (
    <tr className="hover:bg-gray-50">
      <td className="py-2 px-3 border align-middle">{project.name}</td>
      <td className="py-2 px-3 border align-middle">
        {a ? (
          <>{a.quarter}{a.year ? ` ${a.year}` : ''}</>
        ) : (
          <>
            <select
              className="p-2 h-9 border rounded w-full bg-white mb-1"
              value={(inlineRequest[project._id]?.year) || ''}
              onChange={e => handleInlineRequestChange(project._id, 'year', e.target.value)}
              required
            >
              <option value="">Select Year</option>
              {project.year && <option value={project.year}>{project.year}</option>}
            </select>
            <select
              className="p-2 h-9 border rounded w-full bg-white"
              value={(inlineRequest[project._id]?.quarter) || ''}
              onChange={e => handleInlineRequestChange(project._id, 'quarter', e.target.value)}
            >
              <option value="">Select Quarter</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </>
        )}
      </td>
      <td className="py-2 px-3 border w-32 align-middle">{a && a.assignedAuditor ? a.assignedAuditor.name : (
        <select
          className="p-2 h-9 border rounded w-full bg-white"
          value={(inlineRequest[project._id]?.assignedAuditor) || ''}
          onChange={e => handleInlineRequestChange(project._id, 'assignedAuditor', e.target.value)}
        >
          <option value="">Select Auditor</option>
          {auditors.map(aud => (
            <option key={aud._id} value={aud._id}>{aud.name} ({aud.email})</option>
          ))}
        </select>
      )}</td>
      <td className="py-2 px-3 border align-middle">{a ? a.status : <span className="text-gray-400">-</span>}</td>
      <td className="py-2 px-3 border align-middle">
        <ProjectHealthStatus steps={a?.steps} />
      </td>
      <td className="py-2 px-3 border align-middle">{Array.isArray(project.uiSPOCs) ? project.uiSPOCs.join(', ') : <span className="text-gray-400">-</span>}</td>
      <td className="py-2 px-3 border align-middle">{project.deliveryManager || <span className="text-gray-400">-</span>}</td>
      <td className="py-2 px-3 border align-middle">
        {a ? (
          <div className="flex gap-2 items-center">
            <Link
              to={`/audits/${a._id}`}
              className="relative group bg-blue-600 hover:bg-blue-700 text-white rounded-full w-9 h-9 flex items-center justify-center"
              aria-label="View Details"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">View Details</span>
            </Link>
            {a.status !== 'Completed' && (
              <button
                onClick={() => handleResendNotification(a._id)}
                className="relative group bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-60"
                disabled={loadingActions['resend_' + a._id]}
                aria-label="Resend Notification"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8V6a5 5 0 00-10 0v2M5 8h14v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8z" />
                </svg>
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">Resend Notification</span>
              </button>
            )}
            {a.status === 'Completed' && (
              <button
                onClick={() => handleReopenAudit(a._id)}
                className="relative group bg-yellow-600 hover:bg-yellow-700 text-white rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-60"
                disabled={loadingActions['reopen_' + a._id]}
                aria-label="Reopen Audit"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M19.418 15A7.974 7.974 0 0012 8c-1.657 0-3.183.507-4.418 1.382M4.582 9A7.974 7.974 0 0112 16c1.657 0 3.183-.507 4.418-1.382" />
                </svg>
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">Reopen Audit</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1 items-center">
            <button
              className="relative group bg-blue-600 hover:bg-blue-700 text-white rounded-full w-9 h-9 flex items-center justify-center w-full disabled:opacity-60"
              onClick={() => handleInlineRequestSubmit(project._id)}
              type="button"
              disabled={loadingActions['inlineRequest_' + project._id]}
              aria-label="Request Audit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">Request Audit</span>
            </button>
            {inlineRequestStatus[project._id]?.error && <div className="text-red-500 text-xs">{inlineRequestStatus[project._id].error}</div>}
            {inlineRequestStatus[project._id]?.success && <div className="text-green-600 text-xs">{inlineRequestStatus[project._id].success}</div>}
          </div>
        )}
      </td>
    </tr>
  );
}

// Helper to render overall project health status
function ProjectHealthStatus({ steps }) {
  if (!Array.isArray(steps) || steps.length === 0) return <span className="text-gray-400">-</span>;
  let color = 'bg-green-500';
  let label = 'Green';
  if (steps.some(s => s.status === 'red')) { color = 'bg-red-500'; label = 'Red'; }
  else if (steps.some(s => s.status === 'amber')) { color = 'bg-yellow-400'; label = 'Amber'; }
  return (
    <span className="flex items-center gap-2">
      <span className={`inline-block w-4 h-4 rounded-full border ${color}`}></span>
      <span className="font-semibold text-gray-700 text-sm">{label}</span>
    </span>
  );
}

export default Audits; 