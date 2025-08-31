import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdminMappings() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [priority, setPriority] = useState(50);
  const [loading, setLoading] = useState(false);
  const [previewMatches, setPreviewMatches] = useState([]);
  const [previewCount, setPreviewCount] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        axios.get('/api/reports/description-summary?limit=500'),
        axios.get('/api/categories')
      ]);
      setItems(r1.data || []);
      setCategories(r2.data || []);
      setSelected({});
      setPreviewMatches([]);
      setPreviewCount(0);
    } catch (err) {
      console.error(err);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (norm) => setSelected(s => ({ ...s, [norm]: !s[norm] }));

  const chooseTarget = (catName) => { setNewCategoryName(catName); };

  const createCategoryFromSelected = async () => {
    // Map selected normalized keys back to the original sample description strings
    const descriptions = items
      .filter(it => selected[it.normalized])
      .map(it => it.sample)
      .filter(Boolean);

    if (!descriptions.length) return alert('Select at least one description');
    if (!newCategoryName) return alert('Enter or select a target category name');

    if (!window.confirm(`Create category "${newCategoryName}" from ${descriptions.length} selected descriptions?`)) return;

    try {
      setLoading(true);
      const res = await axios.post('/api/admin/create-category-from-descriptions', {
        descriptions,
        name: newCategoryName,
        priority
      });
      const cat = res.data.category;
      alert(`Category ${cat.name} created/updated. You can preview matches next.`);
      await load();
      // automatically preview matches for the created category
      previewForPattern(cat.pattern);
    } catch (err) {
      console.error(err);
      alert('Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const previewForPattern = async (pattern) => {
    try {
      setPreviewMatches([]);
      setPreviewCount(0);
      const res = await axios.post('/api/admin/assign-category-by-pattern', {
        matchType: 'regex',
        pattern,
        category: 'PREVIEW',
        preview: true,
        limit: 20
      });
      setPreviewMatches(res.data.sample || []);
      setPreviewCount(res.data.count || 0);
    } catch (err) {
      console.error(err);
      alert('Preview failed');
    }
  };

  const applyPatternNow = async (pattern, categoryName) => {
    if (!window.confirm(`Apply category "${categoryName}" to ${previewCount} matching transactions?`)) return;
    try {
      const res = await axios.post('/api/admin/assign-category-by-pattern', {
        matchType: 'regex',
        pattern,
        category: categoryName,
        preview: false
      });
      alert(`Applied: matched ${res.data.matched || 0}, modified ${res.data.modified || 0}`);
      await load();
      setPreviewMatches([]);
      setPreviewCount(0);
    } catch (err) {
      console.error(err);
      alert('Apply failed');
    }
  };

  return (
    <div className="container p-3">
      <h3>Description → Category Mapping</h3>

      <div className="mb-3">
        <button className="btn btn-sm btn-secondary me-2" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>

      <div className="row">
        <div className="col-md-7">
          <div className="card mb-3">
            <div className="card-body">
              <h6>Descriptions (select to group)</h6>
              <div style={{maxHeight:400, overflow:'auto'}}>
                <table className="table table-sm mb-0">
                  <thead><tr><th></th><th>Sample</th><th>Count</th><th>Categories seen</th></tr></thead>
                  <tbody>
                    {items.map(it => (
                      <tr key={it.normalized}>
                        <td>
                          <input type="checkbox" checked={!!selected[it.normalized]} onChange={()=>toggle(it.normalized)} />
                        </td>
                        <td title={it.sample} style={{maxWidth:300, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{it.sample}</td>
                        <td>{it.count}</td>
                        <td>{(it.categories || []).join(', ')}</td>
                      </tr>
                    ))}
                    {!items.length && <tr><td colSpan="4" className="text-muted">No descriptions found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-5">
          <div className="card mb-3">
            <div className="card-body">
              <h6>Create category from selection</h6>

              <div className="mb-2">
                <label className="form-label small">Target Category</label>
                <select className="form-select" value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)}>
                  <option value="">-- new or choose existing --</option>
                  {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
                <input className="form-control mt-2" placeholder="Or type new category name" value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)} />
              </div>

              <div className="mb-2">
                <label className="form-label small">Priority</label>
                <input type="number" className="form-control" value={priority} onChange={e=>setPriority(parseInt(e.target.value||50,10))} />
              </div>

              <div className="d-grid gap-2">
                <button className="btn btn-primary" onClick={createCategoryFromSelected} disabled={loading}>Create Category & Preview</button>
              </div>

              <hr />

              <h6>Preview / Apply</h6>
              <div className="mb-2">
                <div className="small text-muted">Preview matches for created category (shows sample rows)</div>
              </div>

              <div style={{maxHeight:240, overflow:'auto'}}>
                <table className="table table-sm mb-0">
                  <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
                  <tbody>
                    {previewMatches.map(tx => (
                      <tr key={tx._id}>
                        <td>{tx.date ? new Date(tx.date).toLocaleDateString() : ''}</td>
                        <td style={{maxWidth:300, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={tx.description}>{tx.description}</td>
                        <td className="text-end">{tx.amount}</td>
                      </tr>
                    ))}
                    {!previewMatches.length && <tr><td colSpan="3" className="text-muted">No preview available</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="mt-2">
                <button className="btn btn-danger" onClick={()=>{
                  if (!previewMatches.length) return alert('No preview to apply');
                  // the created category will be the selected or typed name
                  // build the pattern from previewMatches' normalized descriptions
                  const descriptions = previewMatches.map(p=>p.description).slice(0,50);
                  // call create-category-from-descriptions again to ensure pattern saved, then apply
                  (async ()=>{
                    try {
                      const resp = await axios.post('/api/admin/create-category-from-descriptions', { descriptions, name: newCategoryName, priority });
                      const cat = resp.data.category;
                      await applyPatternNow(cat.pattern, cat.name);
                    } catch (err) {
                      console.error(err);
                      alert('Apply failed');
                    }
                  })();
                }} disabled={!previewMatches.length}>Apply Category to All Matches</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h6>Quick tips</h6>
              <ul>
                <li className="small">Select multiple descriptions that correspond to the same merchant/store, name the category and create a single regex rule.</li>
                <li className="small">Preview first, then Apply — bulk changes are destructive.</li>
                <li className="small">Backup DB (mongodump) before large bulk updates.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}