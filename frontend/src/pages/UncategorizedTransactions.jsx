import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function UncategorizedTransactions() {
  const [txs, setTxs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // load only truly uncategorized items
  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        axios.get('/api/transactions/uncategorized?mode=uncategorized'),
        axios.get('/api/categories')
      ]);
      setTxs(r1.data || []);
      setCategories(r2.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setCategory = async (txId, newCat) => {
    try {
      await axios.put(`/api/transactions/${txId}`, { category: newCat });
      setTxs(txs.map(t => t._id === txId ? { ...t, category: newCat } : t));
    } catch (err) {
      console.error(err);
      alert('Failed to update');
    }
  };

  const applyToAll = async (description, newCat) => {
    if (!description) return alert('No description');
    if (!newCat) return alert('Select a category first');
    if (!window.confirm(`Apply category "${newCat}" to all transactions with description "${description}"?`)) return;
    try {
      const res = await axios.post('/api/admin/assign-category-by-description', { description, category: newCat });
      alert(`Updated ${res.data.modified || 0} transactions (matched ${res.data.matched || 0})`);
      load();
    } catch (err) {
      console.error(err);
      alert('Failed to apply to all');
    }
  };

  return (
    <div className="container p-3">
      <h3>Uncategorized Transactions</h3>
      <div className="mb-2">
        <button className="btn btn-sm btn-secondary" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        <button className="btn btn-sm btn-outline-primary ms-2" onClick={async ()=>{ if (!confirm('Retag all transactions using current rules?')) return; await axios.post('/api/admin/retag-transactions'); load(); }}>Retag All</button>
      </div>
      <table className="table table-sm">
        <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Category</th><th></th></tr></thead>
        <tbody>
          {txs.map(tx => (
            <tr key={tx._id}>
              <td>{tx.date ? new Date(tx.date).toLocaleDateString() : ''}</td>
              <td style={{maxWidth:400}}>{tx.description}</td>
              <td>{tx.amount}</td>
              <td style={{minWidth:200}}>
                <select className="form-select form-select-sm" value={tx.category || ''} onChange={e=>setCategory(tx._id, e.target.value)}>
                  <option value="">Uncategorized</option>
                  {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
              </td>
              <td>
                <div className="btn-group" role="group">
                  <button className="btn btn-sm btn-outline-primary" onClick={()=>setCategory(tx._id, tx.category || '')}>Save</button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={()=>applyToAll(tx.description, tx.category || '')}>Apply to all</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!txs.length && <div className="text-muted">No uncategorized transactions found.</div>}
    </div>
  );
}