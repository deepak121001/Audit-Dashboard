import React, { useEffect, useState } from 'react';
import axios from 'axios';

const initialForm = { name: '', email: '', password: '', role: 'Auditor', region: '' };

const Users = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [error, setError] = useState('');

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
    <div className="p-8 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-4 items-end">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="p-2 border rounded" required />
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="p-2 border rounded" required />
        <input name="password" value={form.password} onChange={handleChange} placeholder="Password" className="p-2 border rounded" required />
        <input name="region" value={form.region} onChange={handleChange} placeholder="Region" className="p-2 border rounded" />
        <select name="role" value={form.role} onChange={handleChange} className="p-2 border rounded">
          <option value="Auditor">Auditor</option>
          <option value="Admin">Admin</option>
          <option value="SPOC">SPOC</option>
        </select>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add</button>
      </form>
      {error && <div className="mb-4 text-red-500">{error}</div>}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Role</th>
            <th className="p-2 border">Region</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              {editId === u._id ? (
                <>
                  <td className="p-2 border"><input name="name" value={editForm.name} onChange={handleEditChange} className="p-1 border rounded" /></td>
                  <td className="p-2 border"><input name="email" value={editForm.email} onChange={handleEditChange} className="p-1 border rounded" /></td>
                  <td className="p-2 border">
                    <select name="role" value={editForm.role} onChange={handleEditChange} className="p-1 border rounded">
                      <option value="Auditor">Auditor</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-2 border"><input name="region" value={editForm.region} onChange={handleEditChange} className="p-1 border rounded" /></td>
                  <td className="p-2 border">
                    <button onClick={handleEditSubmit} className="bg-green-600 text-white px-2 py-1 rounded mr-2">Save</button>
                    <button onClick={() => setEditId(null)} className="bg-gray-400 text-white px-2 py-1 rounded">Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-2 border">{u.name}</td>
                  <td className="p-2 border">{u.email}</td>
                  <td className="p-2 border">{u.role}</td>
                  <td className="p-2 border">{u.region}</td>
                  <td className="p-2 border">
                    <button onClick={() => handleEdit(u)} className="bg-yellow-500 text-white px-2 py-1 rounded mr-2">Edit</button>
                    <button onClick={() => handleDelete(u._id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Users; 