import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

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

const Dashboard = () => {
  const [audits, setAudits] = useState([]);
  const [projectCount, setProjectCount] = useState(0);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [quarterFilter, setQuarterFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const user = getUser();

  const fetchAudits = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/audits', { headers: { Authorization: `Bearer ${token}` } });
      setAudits(res.data);
    } catch (err) {
      setError('Failed to fetch audits');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/projects', { headers: { Authorization: `Bearer ${token}` } });
      setProjectCount(res.data.length);
    } catch {}
  };

  useEffect(() => {
    fetchAudits();
    fetchProjects();
    // eslint-disable-next-line
  }, []);

  // Filter audits based on user role
  let visibleAudits = audits;
  if (user) {
    if (user.role === 'Auditor') {
      visibleAudits = audits.filter(a => a.assignedAuditor && a.assignedAuditor._id === user.userId);
    } else if (user.role === 'Project Manager') {
      visibleAudits = audits.filter(a => a.project && a.project.projectManager === user.email);
    }
  }

  // Apply filters
  visibleAudits = visibleAudits.filter(a =>
    (!statusFilter || a.status === statusFilter) &&
    (!quarterFilter || a.quarter === quarterFilter) &&
    (!projectFilter || a.project?._id === projectFilter)
  );

  // Calculate summary statistics
  const totalAudits = audits.length;
  const pendingAudits = audits.filter(a => a.status === 'Pending').length;
  const inProgressAudits = audits.filter(a => a.status === 'In Progress').length;
  const completedAudits = audits.filter(a => a.status === 'Completed').length;
  const redHealthProjects = audits.filter(a => a.steps?.some(s => s.status === 'red')).length;
  const greenHealthProjects = audits.filter(a => a.steps?.every(s => s.status === 'green')).length;

  // Chart data
  const statusCounts = [pendingAudits, inProgressAudits, completedAudits];
  const barChartData = {
    labels: ['Pending', 'In Progress', 'Completed'],
    datasets: [
      {
        label: 'Audits by Status',
        data: statusCounts,
        backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'],
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const doughnutChartData = {
    labels: ['Red Health', 'Amber Health', 'Green Health'],
    datasets: [
      {
        data: [redHealthProjects, totalAudits - redHealthProjects - greenHealthProjects, greenHealthProjects],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderWidth: 0,
        cutout: '70%',
      },
    ],
  };

  // Unique projects for filter
  const projects = Array.from(new Set(audits.map(a => a.project?._id && a.project))).filter(Boolean);

  // Find pending edit requests (for Admin)
  const pendingEditRequests = user && user.role === 'Admin'
    ? audits.filter(a => a.editRequest && !a.editEnabled)
    : [];

  // Helper to render step names with status color
  function StepNamesWithStatus({ steps }) {
    if (!Array.isArray(steps) || steps.length === 0) return <span className="text-gray-400">-</span>;
    return (
      <div className="flex flex-col gap-1">
        {steps.map((step, idx) => {
          let color = 'text-yellow-600';
          let bg = 'bg-yellow-300';
          if (step.status === 'red') { color = 'text-red-500'; bg = 'bg-red-500'; }
          if (step.status === 'green') { color = 'text-green-600'; bg = 'bg-green-500'; }
          return (
            <span key={idx} className={`flex items-center gap-2 ${color}`} style={{ minHeight: '1.5rem' }}>
              <span className={`inline-block w-3 h-3 rounded-full ${bg} border border-gray-300`}></span>
              <span className="align-middle text-sm">{step.name}</span>
            </span>
          );
        })}
      </div>
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

  // Helper to get status badge styling
  function getStatusBadge(status) {
    const styles = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
      'Completed': 'bg-green-100 text-green-800 border-green-200'
    };
    return `px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`;
  }

  if (!user || user.role !== 'Admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only Admin users can view the dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Monitor audit progress and project health</p>
        </div>

        {/* Summary Cards */}
        <div className="flex gap-6 mb-8 overflow-x-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-[220px]">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7V6a2 2 0 012-2h14a2 2 0 012 2v1M3 7v11a2 2 0 002 2h14a2 2 0 002-2V7M3 7h18" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{projectCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-[220px]">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Audits Requested</p>
                <p className="text-2xl font-bold text-gray-900">{totalAudits}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-[220px]">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{pendingAudits}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-[220px]">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{inProgressAudits}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-[220px]">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{completedAudits}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Requests Alert */}
        {pendingEditRequests.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl shadow-sm">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-yellow-800">Edit Access Requests</h3>
                  <p className="text-yellow-700">{pendingEditRequests.length} auditor(s) requesting edit access</p>
                </div>
                <span className="ml-auto bg-yellow-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  {pendingEditRequests.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingEditRequests.map(a => (
                  <div key={a._id} className="bg-white border border-yellow-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="font-medium text-gray-900 mb-2">{a.project?.name || 'Project'}</div>
                    <div className="text-sm text-gray-600 mb-1">Quarter: <span className="font-semibold">{a.quarter}</span></div>
                    <div className="text-sm text-gray-600 mb-3">Auditor: <span className="italic">{a.assignedAuditor?.name || '-'}</span></div>
                    <a 
                      href={`/audits/${a._id}`} 
                      className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      View Audit
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="flex flex-row gap-8 mb-8 overflow-x-auto">
          <div className="flex-1 min-w-[340px] bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Status Distribution</h3>
            <div className="h-64">
              <Bar 
                data={barChartData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      titleColor: 'white',
                      bodyColor: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderWidth: 1,
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                      }
                    },
                    x: {
                      grid: {
                        display: false,
                      }
                    }
                  }
                }} 
              />
            </div>
          </div>
          <div className="flex-1 min-w-[340px] bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Health Overview</h3>
            <div className="h-64 flex items-center justify-center">
              <Doughnut 
                data={doughnutChartData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { 
                      position: 'bottom',
                      labels: {
                        padding: 20,
                        usePointStyle: true,
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      titleColor: 'white',
                      bodyColor: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderWidth: 1,
                    }
                  }
                }} 
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-row gap-4 overflow-x-auto">
            <div className="min-w-[220px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="min-w-[220px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quarter</label>
              <select
                value={quarterFilter}
                onChange={e => setQuarterFilter(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              >
                <option value="">All Quarters</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>
            <div className="min-w-[220px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              >
                <option value="">All Projects</option>
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setStatusFilter(''); setQuarterFilter(''); setProjectFilter(''); }}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 font-medium transition"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Audit Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Audit Details</h3>
            <p className="text-sm text-gray-600 mt-1">Showing {visibleAudits.length} audit(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Project</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Quarter</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Auditor</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Health</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Progress</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">UI SPOCS</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Delivery Manager</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {visibleAudits.map((a) => {
                  const steps = Array.isArray(a.steps) ? a.steps : [];
                  const total = steps.length;
                  const completed = steps.filter(s => s.completed).length;
                  const progress = total ? Math.round((completed / total) * 100) : 0;
                  return (
                    <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 break-words max-w-xs font-semibold text-gray-900 w-48">{a.project?.name || '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs w-20">{a.quarter}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs w-32">{a.assignedAuditor?.name || '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap w-24">
                        <span className={getStatusBadge(a.status)}>{a.status}</span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap w-24">
                        <ProjectHealthStatus steps={steps} />
                      </td>
                      <td className="px-4 py-2 text-center w-32">
                        <div className="w-24 mx-auto bg-gray-200 rounded-full h-2 mb-1">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600">{progress}%</div>
                      </td>
                      <td className="px-4 py-2 max-w-xs align-top w-40">
                        <div className="truncate" title={Array.isArray(a.project?.uiSPOCs) ? a.project.uiSPOCs.join(', ') : '-'}>
                          {Array.isArray(a.project?.uiSPOCs) ? a.project.uiSPOCs.join(', ') : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs w-40">{a.project?.deliveryManager || '-'}</td>
                      <td className="px-4 py-2 text-center w-24">
                        <a href={`/audits/${a._id}`} title="View Details" className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full w-9 h-9 transition" aria-label="View Details">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibleAudits.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No audits found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or create a new audit.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 