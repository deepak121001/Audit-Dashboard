import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      // Decode JWT to get role
      const payload = JSON.parse(atob(res.data.token.split('.')[1]));
      if (payload.role === 'Admin') {
        navigate('/dashboard');
      } else {
        navigate('/projects');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-purple-100 to-pink-100">
      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-6 border border-blue-100">
        <div className="flex flex-col items-center mb-2">
          <div className="bg-blue-100 rounded-full p-3 mb-2">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5s-3 1.343-3 3 1.343 3 3 3zm0 2c-2.67 0-8 1.337-8 4v2a1 1 0 001 1h14a1 1 0 001-1v-2c0-2.663-5.33-4-8-4z" /></svg>
          </div>
          <h2 className="text-3xl font-extrabold text-blue-800 mb-1">Welcome Back</h2>
          <p className="text-gray-500 text-sm">Sign in to your account</p>
        </div>
        {error && <div className="mb-2 text-red-500 text-center">{error}</div>}
        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold shadow hover:bg-blue-700 transition">Login</button>
        <div className="text-center mt-2 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-medium">Register</Link>
        </div>
      </form>
    </div>
  );
};

export default Login; 