import React, { useState } from 'react';
import axios from 'axios';

function AdminPanel() {
  const [showPanel, setShowPanel] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const ADMIN_PASSWORD = 'admin123'; // In production, this should be environment variable

  const handleClearDatabase = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== ADMIN_PASSWORD) {
      setError('Invalid password');
      return;
    }

    try {
      const response = await axios.post('/api/admin/clear-database', { password });
      if (response.data.success) {
        setSuccess('Database cleared successfully');
        // Reload the page after 2 seconds
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError('Failed to clear database');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to clear database');
    }
  };

  return (
    <div className="mt-4">
      <button 
        className="btn btn-outline-danger btn-sm"
        onClick={() => setShowPanel(!showPanel)}
      >
        Admin Panel
      </button>

      {showPanel && (
        <div className="card mt-2">
          <div className="card-body">
            <h4>Database Management</h4>
            <div className="alert alert-warning">
              Warning: This will permanently delete all accounts and transactions!
            </div>
            
            <form onSubmit={handleClearDatabase}>
              <div className="mb-3">
                <label className="form-label">Admin Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-danger">
                Clear Database
              </button>
            </form>

            {error && (
              <div className="alert alert-danger mt-3">
                {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success mt-3">
                {success}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel; 