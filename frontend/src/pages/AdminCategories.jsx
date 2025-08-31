import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', matchType: 'contains', pattern: '', priority: 0 });
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    const res = await axios.get('/api/categories');
    setCategories(res.data || []);
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
      load();
    } catch (err) {
      console.error(err);
      alert('Save failed');
    }
  };

  const edit = (cat) => { setEditingId(cat._id); setForm({ name: cat.name, matchType: cat.matchType, pattern: cat.pattern, priority: cat.priority }); };
  const del = async (id) => { if (!window.confirm('Delete category?')) return; await axios.delete(`/api/categories/${id}`); load(); };

  return (
    <div className="container p-3">
      <h3>Manage Categories</h3>
      <form onSubmit={save} className="mb-3">
        <div className="row g-2">
          <div className="col-md-3">
            <input className="form-control" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
          </div>
          <div className="col-md-3">
            <select className="form-select" value={form.matchType} onChange={e=>setForm({...form, matchType:e.target.value})}>
              <option value="contains">contains</option>
              <option value="startsWith">startsWith</option>
              <option value="regex">regex</option>
            </select>
          </div>
          <div className="col-md-4">
            <input className="form-control" placeholder="pattern (comma separated for contains)" value={form.pattern} onChange={e=>setForm({...form, pattern:e.target.value})} required />
          </div>
          <div className="col-md-1">
            <input type="number" className="form-control" value={form.priority} onChange={e=>setForm({...form, priority:parseInt(e.target.value||0)})} />
          </div>
          <div className="col-md-1">
            <button className="btn btn-primary w-100" type="submit">{editingId ? 'Update' : 'Add'}</button>
          </div>
        </div>
      </form>

      <table className="table table-sm">
        <thead><tr><th>Name</th><th>Match</th><th>Pattern</th><th>Priority</th><th></th></tr></thead>
        <tbody>
          {categories.map(c => (
            <tr key={c._id}>
              <td>{c.name}</td>
              <td>{c.matchType}</td>
              <td style={{maxWidth:400, overflow:'hidden', textOverflow:'ellipsis'}}>{c.pattern}</td>
              <td>{c.priority}</td>
              <td>
                <button className="btn btn-sm btn-outline-secondary me-2" onClick={()=>edit(c)}>Edit</button>
                <button className="btn btn-sm btn-outline-danger" onClick={()=>del(c._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}