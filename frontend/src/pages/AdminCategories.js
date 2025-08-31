import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', matchType: 'contains', pattern: '', priority: 0 });
  const [editingId, setEditingId] = useState(null);

  // pattern preview/apply state
  const [patternState, setPatternState] = useState({
    matchType: 'contains',
    pattern: '',
    category: '',
    previewLimit: 50,
    previewResults: [],
    previewCount: 0,
    loadingPreview: false,
    applying: false
  });

  const load = async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategories(res.data || []);
    } catch (err) {
      console.error('Failed to load categories', err);
      alert('Failed to load categories');
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e && e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/api/categories/${editingId}`, form);
        setEditingId(null);
      } else {
        await axios.post('/api/categories', form);
      }
      setForm({ name: '', matchType: 'contains', pattern: '', priority: 0 });
      await load();
    } catch (err) {
      console.error('Save failed', err);
      alert('Save failed');
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat._id);
    setForm({ name: cat.name, matchType: cat.matchType || 'contains', pattern: cat.pattern || '', priority: cat.priority || 0 });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete category?')) return;
    try {
      await axios.delete(`/api/categories/${id}`);
      await load();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Delete failed');
    }
  };

  // pattern preview
  const previewPattern = async () => {
    if (!patternState.pattern) return alert('Provide a pattern to preview');
    if (!patternState.category) return alert('Select a target category for preview');
    try {
      setPatternState(s => ({ ...s, loadingPreview: true, previewResults: [], previewCount: 0 }));
      const res = await axios.post('/api/admin/assign-category-by-pattern', {
        matchType: patternState.matchType,
        pattern: patternState.pattern,
        category: patternState.category,
        limit: patternState.previewLimit,
        preview: true
      });
      setPatternState(s => ({ ...s, loadingPreview: false, previewResults: res.data.sample || [], previewCount: res.data.count || 0 }));
    } catch (err) {
      console.error('Preview failed', err);
      setPatternState(s => ({ ...s, loadingPreview: false }));
      alert('Preview failed');
    }
  };

  const applyPattern = async () => {
    if (!patternState.pattern) return alert('Provide a pattern to apply');
    if (!patternState.category) return alert('Select a target category to apply');
    if (!window.confirm(`Apply category "${patternState.category}" to all transactions matching "${patternState.pattern}"? This will update many rows.`)) return;
    try {
      setPatternState(s => ({ ...s, applying: true }));
      const res = await axios.post('/api/admin/assign-category-by-pattern', {
        matchType: patternState.matchType,
        pattern: patternState.pattern,
        category: patternState.category,
        preview: false
      });
      setPatternState(s => ({ ...s, applying: false }));
      alert(`Applied: matched ${res.data.matched || 0}, modified ${res.data.modified || 0}`);
      await load();
    } catch (err) {
      console.error('Apply failed', err);
      setPatternState(s => ({ ...s, applying: false }));
      alert('Apply failed');
    }
  };

  return (
    <div className="container p-3">
      <h3>Manage Categories</h3>

      {/* Category form */}
      <form onSubmit={save} className="mb-3">
        <div className="row g-2">
          <div className="col-md-3">
            <input
              className="form-control"
              placeholder="Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="col-md-3">
            <select
              className="form-select"
              value={form.matchType}
              onChange={e => setForm({ ...form, matchType: e.target.value })}
            >
              <option value="contains">contains</option>
              <option value="startsWith">startsWith</option>
              <option value="regex">regex</option>
            </select>
          </div>

          <div className="col-md-4">
            <input
              className="form-control"
              placeholder="pattern (comma separated for contains)"
              value={form.pattern}
              onChange={e => setForm({ ...form, pattern: e.target.value })}
              required
            />
          </div>

          <div className="col-md-1">
            <input
              type="number"
              className="form-control"
              value={form.priority}
              onChange={e => setForm({ ...form, priority: parseInt(e.target.value || 0, 10) })}
            />
          </div>

          <div className="col-md-1">
            <button className="btn btn-primary w-100" type="submit">
              {editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      </form>

      {/* Pattern preview / apply panel */}
      <div className="card mb-3">
        <div className="card-body">
          <h5 className="card-title">Apply Category By Pattern (Preview then Apply)</h5>

          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small">Match Type</label>
              <select
                className="form-select"
                value={patternState.matchType}
                onChange={e => setPatternState(s => ({ ...s, matchType: e.target.value }))}
              >
                <option value="contains">contains (comma-separated tokens)</option>
                <option value="startsWith">startsWith</option>
                <option value="regex">regex</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label small">Pattern</label>
              <input
                className="form-control"
                value={patternState.pattern}
                onChange={e => setPatternState(s => ({ ...s, pattern: e.target.value }))}
                placeholder="e.g. woolworths,coles or ^SQ \*"
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small">Target Category</label>
              <select
                className="form-select"
                value={patternState.category}
                onChange={e => setPatternState(s => ({ ...s, category: e.target.value }))}
              >
                <option value="">-- select --</option>
                {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div className="col-md-1">
              <label className="form-label small">Limit</label>
              <input
                type="number"
                className="form-control"
                value={patternState.previewLimit}
                onChange={e => setPatternState(s => ({ ...s, previewLimit: parseInt(e.target.value || 50, 10) }))}
              />
            </div>

            <div className="col-md-1">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={previewPattern}
                disabled={patternState.loadingPreview}
              >
                {patternState.loadingPreview ? 'Previewing...' : 'Preview'}
              </button>
            </div>
          </div>

          <div className="mt-3">
            <div className="mb-2"><strong>Matches:</strong> {patternState.previewCount} (showing up to {patternState.previewLimit})</div>
            <div style={{ maxHeight: 240, overflow: 'auto' }}>
              <table className="table table-sm mb-0">
                <thead><tr><th>Date</th><th>Description</th><th className="text-end">Amount</th></tr></thead>
                <tbody>
                  {patternState.previewResults.map(tx => (
                    <tr key={tx._id}>
                      <td>{tx.date ? new Date(tx.date).toLocaleDateString() : ''}</td>
                      <td style={{ maxWidth: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={tx.description}>{tx.description}</td>
                      <td className="text-end">{tx.amount}</td>
                    </tr>
                  ))}
                  {!patternState.previewResults.length && <tr><td colSpan="3" className="text-muted">No preview results</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="mt-2">
              <button className="btn btn-danger" onClick={applyPattern} disabled={patternState.applying}>
                {patternState.applying ? 'Applying...' : 'Apply to all matched'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Categories list */}
      <table className="table table-sm">
        <thead><tr><th>Name</th><th>Match</th><th>Pattern</th><th>Priority</th><th></th></tr></thead>
        <tbody>
          {categories.map(c => (
            <tr key={c._id}>
              <td>{c.name}</td>
              <td>{c.matchType}</td>
              <td style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.pattern}</td>
              <td>{c.priority}</td>
              <td>
                <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => startEdit(c)}>Edit</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => remove(c._id)}>Delete</button>
              </td>
            </tr>
          ))}
          {!categories.length && <tr><td colSpan="5" className="text-muted">No categories defined</td></tr>}
        </tbody>
      </table>
    </div>
  );
}