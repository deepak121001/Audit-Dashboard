import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';

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

const Navbar = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (user?.role === 'Admin') {
      const token = localStorage.getItem('token');
      fetch('/api/audits', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          const pending = data.filter(a => a.editRequest && !a.editEnabled);
          setNotifications(pending);
        });
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow px-6 py-3 flex items-center justify-between">
      <div className="flex-1 flex justify-center">
        {/* Logo */}
        <span className="block w-36 h-10 ml-40">
          <svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 87" className="w-full h-full">
            <defs>
              <style>{`.cls-1 { fill: #eb1000; }`}</style>
            </defs>
            <path className="cls-1" d="M0,85.75L34.93,2.48h24.48l34.67,83.27h-25.97l-21.87-55.31-14.42,36.29h17.15l6.83,19.02H0ZM126.13,87c-19.51,0-36.04-11.06-36.04-33.06s16.03-34.18,32.69-34.18c2.61,0,5.22.25,7.95.87V0h21.62v82.03c-4.97,2.24-15.53,4.97-26.22,4.97ZM125.64,69.1c1.86,0,3.61-.25,5.1-.75v-30.2c-1.49-.62-3.23-.99-5.22-.99-7.21,0-13.8,5.34-13.8,16.4s6.71,15.54,13.92,15.54ZM190.87,86.87c-18.14,0-33.31-12.18-33.31-33.56s15.16-33.56,33.31-33.56,33.43,12.18,33.43,33.56-15.28,33.56-33.43,33.56ZM190.87,68.85c6.34,0,11.93-4.97,11.93-15.53s-5.59-15.54-11.93-15.54-11.8,4.97-11.8,15.54,5.47,15.53,11.8,15.53ZM255.37,87c-8.45,0-19.14-1.74-25.85-4.85V0h21.63v20.51c2.74-.5,5.47-.87,8.08-.87,17.03,0,32.69,11.18,32.69,32.81,0,22.87-16.78,34.55-36.54,34.55ZM251.14,38.28v30.08c1.37.5,2.98.75,4.85.75,7.33,0,14.29-5.22,14.29-16.41,0-10.44-6.71-15.41-13.92-15.41-1.99,0-3.6.37-5.22.99ZM296.86,53.19c0-20.76,14.54-33.43,31.94-33.43,16.28,0,31.19,10.44,31.19,31.44,0,2.86-.12,5.59-.5,8.33h-40.64c2.36,7.33,8.83,10.81,16.91,10.81,6.59,0,12.68-1.62,19.51-4.6v16.53c-6.34,3.23-13.92,4.6-21.75,4.6-20.63,0-36.66-12.43-36.66-33.68ZM318.61,45.98h21.13c-1.12-7.09-5.84-9.94-10.69-9.94s-8.83,2.98-10.44,9.94Z"/>
          </svg>
        </span>
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <>
            <div className="text-right mr-4">
              <div className="font-semibold text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-700">{user.email}</div>
              <div className="text-xs capitalize text-gray-700">{user.role}</div>
            </div>
            {user.role === 'Admin' && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(v => !v)}
                  className="relative group bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-full w-10 h-10 flex items-center justify-center transition shadow"
                  aria-label="Notifications"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 bg-yellow-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{notifications.length}</span>
                  )}
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-96 bg-white border border-yellow-200 rounded-xl shadow-lg z-50 p-4">
                    <div className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Edit Access Requests
                    </div>
                    {notifications.length === 0 ? (
                      <div className="text-gray-500 text-sm">No pending requests.</div>
                    ) : (
                      notifications.map(a => (
                        <div key={a._id} className="mb-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                          <div className="font-semibold text-gray-900">{a.project?.name || 'Project'}</div>
                          <div className="text-xs text-gray-600 mb-1">Quarter: <span className="font-semibold">{a.quarter}</span></div>
                          <div className="text-xs text-gray-600 mb-2">Auditor: <span className="italic">{a.assignedAuditor?.name || '-'}</span></div>
                          <Link
                            to={`/audits/${a._id}`}
                            className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Audit
                            <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="relative group bg-red-50 hover:bg-red-100 text-red-600 rounded-full w-10 h-10 flex items-center justify-center transition shadow"
              aria-label="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
              </svg>
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">Logout</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 