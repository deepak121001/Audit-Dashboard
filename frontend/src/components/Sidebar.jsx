import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

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

const Sidebar = () => {
  const navigate = useNavigate();
  const role = getUserRole();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleNav = (to) => {
    setOpen(false);
    navigate(to);
  };

  const isActive = (path) => window.location.pathname === path;

  return (
    <>
      {/* Hamburger for mobile */}
      <button
        className="fixed top-4 left-4 z-30 bg-[#374151] text-white p-2 rounded shadow-lg"
        onClick={() => setOpen(true)}
        aria-label="Open sidebar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-20" onClick={() => setOpen(false)}></div>
      )}
      {/* Sidebar */}
      <div
        className={`h-screen w-56 bg-[#374151] text-white flex flex-col justify-between fixed top-0 left-0 shadow-xl z-30
          transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:flex md:w-56 md:z-10`}
        style={{ minWidth: '14rem' }}
      >
        <div>
          <div className="text-2xl font-bold px-6 py-6 border-b border-[#eb1000] bg-[#374151] text-white">Audit Dashboard</div>
          <nav className="flex flex-col gap-2 mt-6 px-4">
            {role === 'Admin' && (
              <button onClick={() => handleNav('/dashboard')} className={`${isActive('/dashboard') ? 'bg-[#eb1000] text-white rounded px-3 py-2 font-bold' : 'px-3 py-2 rounded hover:bg-[#ffe0db] hover:text-[#eb1000] transition'}`}>Dashboard</button>
            )}
            <button onClick={() => handleNav('/projects')} className={`${isActive('/projects') ? 'bg-[#eb1000] text-white rounded px-3 py-2 font-bold' : 'px-3 py-2 rounded hover:bg-[#ffe0db] hover:text-[#eb1000] transition'}`}>{role === 'Admin' ? 'Add Projects' : 'Projects'}</button>
            <button onClick={() => handleNav('/audits')} className={`${isActive('/audits') ? 'bg-[#eb1000] text-white rounded px-3 py-2 font-bold' : 'px-3 py-2 rounded hover:bg-[#ffe0db] hover:text-[#eb1000] transition'}`}>{role === 'Admin' ? 'Request Audits' : 'Audits'}</button>
            {role === 'Admin' && (
              <button onClick={() => handleNav('/users')} className={`${isActive('/users') ? 'bg-[#eb1000] text-white rounded px-3 py-2 font-bold' : 'px-3 py-2 rounded hover:bg-[#ffe0db] hover:text-[#eb1000] transition'}`}>Add Users</button>
            )}
          </nav>
        </div>
        <button onClick={() => { setOpen(false); handleLogout(); }} className="m-4 bg-[#eb1000] text-white px-3 py-2 rounded hover:bg-white hover:text-[#eb1000] transition">Logout</button>
      </div>
    </>
  );
};

export default Sidebar; 