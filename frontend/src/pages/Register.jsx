import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', region: '', role: 'Auditor' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await axios.post('/api/auth/register', form);
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-6 border border-blue-100">
        <div className="flex flex-col items-center mb-2">
          <div className="bg-blue-100 rounded-full p-3 mb-2">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5s-3 1.343-3 3 1.343 3 3 3zm0 2c-2.67 0-8 1.337-8 4v2a1 1 0 001 1h14a1 1 0 001-1v-2c0-2.663-5.33-4-8-4z" /></svg>
          </div>
          <h2 className="text-3xl font-extrabold text-blue-800 mb-1">Create Account</h2>
          <p className="text-gray-500 text-sm">Register to get started</p>
        </div>
        {error && <div className="mb-2 text-red-500 text-center">{error}</div>}
        {success && <div className="mb-2 text-green-600 text-center">{success}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            name="name"
            placeholder="Name"
            className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={form.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={form.password}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="region"
            placeholder="Region"
            className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={form.region}
            onChange={handleChange}
          />
          <select
            name="role"
            className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={form.role}
            onChange={handleChange}
          >
            <option value="Auditor">Auditor</option>
            <option value="Admin">Admin</option>
            <option value="SPOC">SPOC</option>
          </select>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-semibold text-lg">Register</button>
        </form>
        <div className="mt-2 text-center">
          <span className="text-gray-600">Already have an account?</span>
          <a href="/login" className="ml-2 inline-block bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded hover:bg-blue-100 hover:text-blue-900 font-semibold transition">Login</a>
        </div>
      </div>
    </div>
  );
};

export default Register; 