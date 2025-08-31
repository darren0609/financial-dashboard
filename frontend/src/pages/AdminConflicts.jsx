import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdminConflicts() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [opsInProgress, setOpsInProgress] = useState({});
  const [selected, setSelected] = useState({}); // txId -> selected category

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([axios.get('/api/transactions/conflicts'), axios.get('/api/categories')]);
      setItems(r1.data || []);
      setCategories(r2.data || []);
      // reset selections
      const map = {};
      (r1.data || []).forEach(it => { map[it.transaction._id] = ''; });
      setSelected(map);
    } catch (err) {
      console.error(err);
      alert('Failed to load conflicts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setOp = (txId, flag) => setOpsInProgress(s => ({ ...s, [txId]: flag }));

  const resolve = async (txId, chosenCategory) => {
    if (!chosenCategory) return alert('Select a category first');
    if (!window.confirm(`Set category "${chosenCategory}" for this transaction?`)) return;
    try {
      setOp(txId, true);
      await axios.put(`/api/transactions/${txId}`, { category: chosenCategory });
      alert('Transaction updated');
      await load();
    } catch (err) {
      console.error(err);
      alert('Failed to update transaction');
    } finally {
      setOp(txId, false);
    }
  };

  const applyToAll = async (description, chosenCategory) => {
    if (!description || !chosenCategory) return alert('Description and category required');
    if (!window.confirm(`Apply category "${chosenCategory}" to all transactions with description "${description}"?`)) return;
    try {
      // use a temporary global op flag
      const key = `apply:${description}`;
      setOpsInProgress(s => ({ ...s, [key]: true }));
      const res = await axios.post('/api/admin/assign-category-by-description', { description, category: chosenCategory });
      alert(`Updated ${res.data.modified || 0} transactions (matched ${res.data.matched || 0})`);
      await load();
    } catch (err) {
      console.error(err);
      alert('Failed to apply to all');
    } finally {
      const key = `apply:${description}`;
      setOpsInProgress(s => ({ ...s, [key]: false }));
    }
  };

  return (
    <div className="container p-3">
      <h3>Category Conflicts</h3>
      <div className="mb-2 d-flex gap-2">
        <button className="btn btn-sm btn-secondary" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      <table className="table table-sm">
        <thead>
          <tr><th>Date</th><th>Description</th><th>Amount</th><th>Current</th><th>Matches</th><th></th></tr>
        </thead>
        <tbody>
          {items.map(it => {
            const tx = it.transaction;
            const txId = tx._id;
            const sel = selected[txId] || '';
            const inProgress = opsInProgress[txId];
            const applyKey = `apply:${tx.description}`;
            return (
              <tr key={txId}>
                <td>{tx.date ? new Date(tx.date).toLocaleDateString() : ''}</td>
                <td style={{maxWidth:400, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={tx.description}>{tx.description}</td>
                <td>{tx.amount}</td>
                <td>{tx.category || 'Uncategorized'}</td>
                <td style={{minWidth:240}}>
                  <select
                    className="form-select form-select-sm"
                    value={sel}
                    onChange={e => setSelected(s => ({ ...s, [txId]: e.target.value }))}
                  >
                    <option value="">-- choose --</option>
                    {it.matches.map(m => <option key={m} value={m}>{m}</option>)}
                    {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                  </select>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => resolve(txId, sel)}
                      disabled={!sel || inProgress}
                    >
                      {inProgress ? 'Saving...' : 'Set'}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => applyToAll(tx.description, sel)}
                      disabled={!sel || opsInProgress[applyKey]}
                    >
                      {opsInProgress[applyKey] ? 'Applying...' : 'Apply to all'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!items.length && <div className="text-muted">No conflicts found.</div>}
    </div>
  );
}