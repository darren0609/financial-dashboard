import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import AdminCategories from './pages/AdminCategories';
import UncategorizedTransactions from './pages/UncategorizedTransactions';
import AdminConflicts from './pages/AdminConflicts';
import AdminMappings from './pages/AdminMappings';

function App() {
  return (
    <Router>
      <div>
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
          <div className="container-fluid">
            <Link className="navbar-brand" to="/">Financial Dashboard</Link>
            <div className="collapse navbar-collapse">
              <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                <li className="nav-item"><Link className="nav-link" to="/login">Login</Link></li>
                <li className="nav-item"><Link className="nav-link" to="/dashboard">Dashboard</Link></li>
                <li className="nav-item"><Link className="nav-link" to="/admin/categories">Categories</Link></li>
                <li className="nav-item"><Link className="nav-link" to="/admin/uncategorized">Uncategorized</Link></li>
                <li className="nav-item"><Link className="nav-link" to="/admin/conflicts">Conflicts</Link></li>
                <li className="nav-item"><Link className="nav-link" to="/admin/mappings">Mappings</Link></li>
              </ul>
            </div>
          </div>
        </nav>

        <div className="container mt-5">
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/uncategorized" element={<UncategorizedTransactions />} />
            <Route path="/admin/conflicts" element={<AdminConflicts />} />
            <Route path="/admin/mappings" element={<AdminMappings />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
