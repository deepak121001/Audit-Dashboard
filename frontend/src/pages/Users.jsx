import React, { useEffect, useState } from 'react';
import axios from 'axios';

const initialForm = { name: '', email: '', password: '', role: 'Auditor', region: '' };

const Users = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/user', { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data);
    } catch (err) {
      setError('Failed to fetch users');
    }
  };

  useEffect(() => {
    fetchUsers();
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
      await axios.post('/api/user', form, { headers: { Authorization: `Bearer ${token}` } });
      setForm(initialForm);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add user');
    }
  };

  const handleEdit = (user) => {
    setEditId(user._id);
    setEditForm({ ...user, password: '' });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/user/${editId}`, editForm, { headers: { Authorization: `Bearer ${token}` } });
      setEditId(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/user/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-10 relative">
        <h2 className="text-3xl font-bold mb-6 text-gray-900">User Management</h2>
        <div className="flex justify-end mb-6">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg font-semibold text-base transition flex items-center gap-2"
            onClick={() => setShowAddModal(true)}
            style={{minWidth: '140px'}}
            aria-label="Add User"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>
        {showAddModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-xl relative">
              <button onClick={() => setShowAddModal(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl" aria-label="Close">&times;</button>
              <h3 className="text-xl font-bold mb-4">Add User</h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
                <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="p-3 border rounded" required />
                <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="p-3 border rounded" required />
                <input name="password" value={form.password} onChange={handleChange} placeholder="Password" className="p-3 border rounded" required />
                <input name="region" value={form.region} onChange={handleChange} placeholder="Region" className="p-3 border rounded" />
                <select name="role" value={form.role} onChange={handleChange} className="p-3 border rounded">
                  <option value="Auditor">Auditor</option>
                  <option value="Admin">Admin</option>
                  <option value="SPOC">SPOC</option>
                </select>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Add</button>
              </form>
              {error && <div className="mt-2 text-red-500 font-medium">{error}</div>}
            </div>
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 z-10 bg-gray-100 border-b text-xs uppercase">
              <tr>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Role</th>
                <th className="p-2 border">Region</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u._id} className={editId === u._id ? 'bg-yellow-50' : 'hover:bg-blue-50 transition'}>
                  {editId === u._id ? (
                    <>
                      <td className="p-2 border"><input name="name" value={editForm.name} onChange={handleEditChange} className="p-2 border rounded w-full" /></td>
                      <td className="p-2 border"><input name="email" value={editForm.email} onChange={handleEditChange} className="p-2 border rounded w-full" /></td>
                      <td className="p-2 border">
                        <select name="role" value={editForm.role} onChange={handleEditChange} className="p-2 border rounded w-full">
                          <option value="Auditor">Auditor</option>
                          <option value="Admin">Admin</option>
                          <option value="SPOC">SPOC</option>
                        </select>
                      </td>
                      <td className="p-2 border"><input name="region" value={editForm.region} onChange={handleEditChange} className="p-2 border rounded w-full" /></td>
                      <td className="p-2 border flex gap-2 items-center">
                        <button onClick={handleEditSubmit} className="relative group bg-green-600 hover:bg-green-700 text-white rounded-full w-9 h-9 flex items-center justify-center transition" aria-label="Save">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">Save</span>
                        </button>
                        <button onClick={() => setEditId(null)} className="relative group bg-gray-400 hover:bg-gray-500 text-white rounded-full w-9 h-9 flex items-center justify-center transition" aria-label="Cancel">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">Cancel</span>
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2 border flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-200 text-blue-800 font-bold text-base">
                          {u.name ? u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '?'}
                        </span>
                        <span>{u.name}</span>
                      </td>
                      <td className="p-2 border">{u.email}</td>
                      <td className="p-2 border">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${u.role === 'Admin' ? 'bg-red-100 text-red-700' : u.role === 'Auditor' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{u.role}</span>
                      </td>
                      <td className="p-2 border">{u.region}</td>
                      <td className="p-2 border flex gap-2 items-center">
                        <button onClick={() => handleEdit(u)} className="relative group bg-yellow-400 hover:bg-yellow-500 text-white rounded-full w-9 h-9 flex items-center justify-center transition" aria-label="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 10-4-4l-8 8v3z" />
                          </svg>
                          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">Edit</span>
                        </button>
                        <button onClick={() => handleDelete(u._id)} className="relative group bg-red-500 hover:bg-red-600 text-white rounded-full w-9 h-9 flex items-center justify-center transition" aria-label="Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">Delete</span>
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users; 