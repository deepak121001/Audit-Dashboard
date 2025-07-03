import React, { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./ProtectedRoute";
import Users from "./pages/Users";
import Sidebar from "./components/Sidebar";
import AuditDetails from "./pages/AuditDetails";
import Dashboard from "./pages/Dashboard";
import Navbar from "./components/Navbar";
// Placeholder imports for dashboard, projects, audits
const Projects = React.lazy(() => import("./pages/Projects"));
const Audits = React.lazy(() => import("./pages/Audits"));

function ProtectedLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1">
          <Suspense fallback={<div className="p-8">Loading...</div>}>
            {children}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><ProtectedLayout><Dashboard /></ProtectedLayout></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><ProtectedLayout><Projects /></ProtectedLayout></ProtectedRoute>} />
        <Route path="/audits" element={<ProtectedRoute><ProtectedLayout><Audits /></ProtectedLayout></ProtectedRoute>} />
        <Route path="/audits/:id" element={<ProtectedRoute><ProtectedLayout><AuditDetails /></ProtectedLayout></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><ProtectedLayout><Users /></ProtectedLayout></ProtectedRoute>} />
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
