import React, { useEffect, useState } from 'react';
import axios from 'axios';

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

const initialForm = { drNumber: '', name: '', region: '', technology: '', uiSPOCs: '', deliveryManager: '', projectManager: '', auditorName: '', regionalSPOCLead: '', year: '' };

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const role = getUserRole();
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [editError, setEditError] = useState('');
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data);
    } catch (err) {
      setError('Failed to fetch projects');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload = { ...form, uiSPOCs: form.uiSPOCs.split(',').map(s => s.trim()).filter(Boolean) };
      await axios.post('/api/projects', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setForm(initialForm);
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add project');
    }
  };

  const openEditModal = (project) => {
    setEditId(project._id);
    setEditForm({
      drNumber: project.drNumber || '',
      name: project.name || '',
      region: project.region || '',
      technology: project.technology || '',
      uiSPOCs: Array.isArray(project.uiSPOCs) ? project.uiSPOCs.join(', ') : '',
      deliveryManager: project.deliveryManager || '',
      projectManager: project.projectManager || '',
      auditorName: project.auditorName || '',
      regionalSPOCLead: project.regionalSPOCLead || '',
      year: project.year || '',
    });
    setEditError('');
    setEditModal(true);
  };

  const closeEditModal = () => {
    setEditModal(false);
    setEditId(null);
    setEditForm(initialForm);
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    try {
      const token = localStorage.getItem('token');
      const payload = { ...editForm, uiSPOCs: editForm.uiSPOCs.split(',').map(s => s.trim()).filter(Boolean) };
      await axios.put(`/api/projects/${editId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      closeEditModal();
      fetchProjects();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update project');
    }
  };

  // Delete project handler
  const handleDelete = async (projectId, projectName) => {
    if (!window.confirm(`Are you sure you want to delete project "${projectName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete project');
    }
  };

  // Bulk upload handler
  const handleBulkUpload = async (e) => {
    setBulkResult(null);
    setBulkError('');
    setBulkLoading(true);
    const file = e.target.files[0];
    if (!file) return;
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/api/projects/bulk-upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setBulkResult(res.data);
      fetchProjects();
    } catch (err) {
      setBulkError(err.response?.data?.message || 'Bulk upload failed');
    } finally {
      setBulkLoading(false);
      e.target.value = '';
    }
  };

  // Handle individual project selection
  const handleProjectSelect = (projectId) => {
    setSelectedProjects(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId);
      } else {
        return [...prev, projectId];
      }
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProjects([]);
      setSelectAll(false);
    } else {
      setSelectedProjects(projects.map(p => p._id));
      setSelectAll(true);
    }
  };

  // Bulk delete selected projects
  const handleBulkDelete = async () => {
    if (selectedProjects.length === 0) {
      setError('Please select at least one project to delete');
      return;
    }

    const projectNames = projects
      .filter(p => selectedProjects.includes(p._id))
      .map(p => p.name)
      .join(', ');

    if (!window.confirm(`Are you sure you want to delete ${selectedProjects.length} project(s): "${projectNames}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      // Delete projects one by one (or you could create a bulk delete endpoint)
      for (const projectId of selectedProjects) {
        await axios.delete(`/api/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setSelectedProjects([]);
      setSelectAll(false);
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete selected projects');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-10 relative">
        <h2 className="text-3xl font-bold mb-6 text-gray-900">Projects</h2>
        {role === 'Admin' && (
          <div className="flex justify-end mb-6">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg font-semibold text-base transition flex items-center gap-2"
              onClick={() => setShowAddModal(true)}
              style={{minWidth: '140px'}}
              aria-label="Add Project"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Project
            </button>
          </div>
        )}
        {role === 'Admin' && showAddModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-xl relative">
              <button onClick={() => setShowAddModal(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl" aria-label="Close">&times;</button>
              <h3 className="text-xl font-bold mb-4">Add Project</h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
                <input name="drNumber" value={form.drNumber} onChange={handleChange} placeholder="DR Number" className="p-2 border rounded" required />
                <input name="name" value={form.name} onChange={handleChange} placeholder="Project Name" className="p-2 border rounded" required />
                <input name="region" value={form.region} onChange={handleChange} placeholder="Region" className="p-2 border rounded" />
                <input name="technology" value={form.technology} onChange={handleChange} placeholder="Technology" className="p-2 border rounded" />
                <input name="uiSPOCs" value={form.uiSPOCs} onChange={handleChange} placeholder="UI SPOCS (comma separated)" className="p-2 border rounded" />
                <input name="deliveryManager" value={form.deliveryManager} onChange={handleChange} placeholder="Delivery Manager" className="p-2 border rounded" />
                <input name="projectManager" value={form.projectManager} onChange={handleChange} placeholder="Project Manager" className="p-2 border rounded" />
                <input name="regionalSPOCLead" value={form.regionalSPOCLead} onChange={handleChange} placeholder="Regional SPOC Lead" className="p-2 border rounded" />
                <input name="year" type="number" value={form.year} onChange={handleChange} placeholder="Year (e.g. 2024)" className="p-2 border rounded w-32" min="2000" max="2100" />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Add</button>
              </form>
              {error && <div className="mt-2 text-red-500">{error}</div>}
            </div>
          </div>
        )}
        {role === 'Admin' && (
          <div className="mb-8">
            <label className="block mb-2 font-semibold">Bulk Upload Projects (Excel):</label>
            <input type="file" accept=".xlsx,.xls" onChange={handleBulkUpload} className="mb-2" />
            {bulkLoading && <div className="text-blue-600">Uploading...</div>}
            {bulkResult && (
              <div className="text-green-700 bg-green-50 border border-green-200 rounded p-2 mt-2">
                <div>Created: {bulkResult.created}</div>
                <div>Failed: {bulkResult.failed}</div>
                {bulkResult.errors && bulkResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer">Show Errors</summary>
                    <ul className="text-red-600 text-xs">
                      {bulkResult.errors.map((err, idx) => (
                        <li key={idx}>{err.error}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
            {bulkError && <div className="text-red-600 mt-2">{bulkError}</div>}
          </div>
        )}
        {role === 'Admin' && selectedProjects.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between shadow-sm">
            <span className="text-blue-800 font-medium">
              {selectedProjects.length} project(s) selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-medium transition"
            >
              Delete Selected ({selectedProjects.length})
            </button>
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 z-10 bg-gray-100 border-b text-xs uppercase">
              <tr>
                {role === 'Admin' && (
                  <th className="p-2 border sticky left-0 bg-gray-100 z-20">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                )}
                <th className={`p-2 border sticky ${role === 'Admin' ? 'left-12' : 'left-0'} bg-gray-100 z-10`}>DR Number</th>
                <th className={`p-2 border sticky ${role === 'Admin' ? 'left-36' : 'left-24'} bg-gray-100 z-10`}>Name</th>
                <th className="p-2 border">Year</th>
                <th className="p-2 border">Region</th>
                <th className="p-2 border">Technology</th>
                <th className="p-2 border">UI SPOCS</th>
                <th className="p-2 border">Delivery Manager</th>
                <th className="p-2 border">Project Manager</th>
                <th className="p-2 border">Regional SPOC Lead</th>
                {role === 'Admin' && <th className="p-2 border">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((p, idx) => (
                <tr key={p._id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-blue-50 transition'}>
                  {role === 'Admin' && (
                    <td className="p-2 border align-middle sticky left-0 bg-white z-10">
                      <input
                        type="checkbox"
                        checked={selectedProjects.includes(p._id)}
                        onChange={() => handleProjectSelect(p._id)}
                        className="w-4 h-4"
                      />
                    </td>
                  )}
                  <td className={`p-2 border align-middle font-semibold text-gray-800 sticky ${role === 'Admin' ? 'left-12' : 'left-0'} bg-white z-10`}>{p.drNumber}</td>
                  <td className={`p-2 border align-middle sticky ${role === 'Admin' ? 'left-36' : 'left-24'} bg-white z-10`}>
                    <span className="font-medium text-blue-700">{p.name}</span>
                  </td>
                  <td className="p-2 border align-middle">{p.year || '-'}</td>
                  <td className="p-2 border align-middle">
                    {p.region ? <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">{p.region}</span> : '-'}
                  </td>
                  <td className="p-2 border align-middle">
                    {p.technology ? <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">{p.technology}</span> : '-'}
                  </td>
                  <td className="p-2 border align-middle">
                    {Array.isArray(p.uiSPOCs) && p.uiSPOCs.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.uiSPOCs.map((spoc, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">
                            {spoc.includes('@') ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-400 text-white mr-1 text-xs font-bold">
                                {spoc[0].toUpperCase()}
                              </span>
                            ) : null}
                            {spoc}
                          </span>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="p-2 border align-middle">
                    {p.deliveryManager ? (
                      <span className="inline-flex items-center gap-2">
                        {p.deliveryManager.includes('@') ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-pink-400 text-white text-xs font-bold">
                            {p.deliveryManager[0].toUpperCase()}
                          </span>
                        ) : null}
                        {p.deliveryManager}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-2 border align-middle">
                    {p.projectManager ? (
                      <span className="inline-flex items-center gap-2">
                        {p.projectManager.includes('@') ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 text-white text-xs font-bold">
                            {p.projectManager[0].toUpperCase()}
                          </span>
                        ) : null}
                        {p.projectManager}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-2 border align-middle">{p.regionalSPOCLead || '-'}</td>
                  {role === 'Admin' && (
                    <td className="p-2 border align-middle">
                      <div className="flex gap-2">
                        <button onClick={() => openEditModal(p)} className="relative group bg-yellow-400 hover:bg-yellow-500 text-white rounded-full w-9 h-9 flex items-center justify-center transition" aria-label="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 10-4-4l-8 8v3z" />
                          </svg>
                          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">Edit</span>
                        </button>
                        <button onClick={() => handleDelete(p._id, p.name)} className="relative group bg-red-500 hover:bg-red-600 text-white rounded-full w-9 h-9 flex items-center justify-center transition" aria-label="Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">Delete</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg relative">
              <button onClick={closeEditModal} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              <h3 className="text-xl font-bold mb-4">Edit Project</h3>
              <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
                <input name="drNumber" value={editForm.drNumber} onChange={handleEditChange} placeholder="DR Number" className="p-2 border rounded" required disabled />
                <input name="name" value={editForm.name} onChange={handleEditChange} placeholder="Project Name" className="p-2 border rounded" required />
                <input name="region" value={editForm.region} onChange={handleEditChange} placeholder="Region" className="p-2 border rounded" />
                <input name="technology" value={editForm.technology} onChange={handleEditChange} placeholder="Technology" className="p-2 border rounded" />
                <input name="uiSPOCs" value={editForm.uiSPOCs} onChange={handleEditChange} placeholder="UI SPOCS (comma separated)" className="p-2 border rounded" />
                <input name="deliveryManager" value={editForm.deliveryManager} onChange={handleEditChange} placeholder="Delivery Manager" className="p-2 border rounded" />
                <input name="projectManager" value={editForm.projectManager} onChange={handleEditChange} placeholder="Project Manager" className="p-2 border rounded" />
                <input name="regionalSPOCLead" value={editForm.regionalSPOCLead} onChange={handleEditChange} placeholder="Regional SPOC Lead" className="p-2 border rounded" />
                <input name="year" type="number" value={editForm.year} onChange={handleEditChange} placeholder="Year (e.g. 2024)" className="p-2 border rounded w-32" min="2000" max="2100" />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Update</button>
              </form>
              {editError && <div className="mt-2 text-red-500">{editError}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects; 