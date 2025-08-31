import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const fmt = (v) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(v || 0);

// compute start/end based on period
const computeRange = (period, refDate, customFrom, customTo) => {
  if (period === 'all') return {};
  const d = refDate ? new Date(refDate) : new Date();
  let start, end;
  if (period === 'month') {
    start = new Date(d.getFullYear(), d.getMonth(), 1);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === 'quarter') {
    const q = Math.floor(d.getMonth() / 3);
    start = new Date(d.getFullYear(), q * 3, 1);
    end = new Date(d.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
  } else if (period === 'year') {
    start = new Date(d.getFullYear(), 0, 1);
    end = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else if (period === 'custom') {
    start = customFrom ? new Date(customFrom) : undefined;
    end = customTo ? new Date(customTo) : undefined;
    if (start) start.setHours(0,0,0,0);
    if (end) end.setHours(23,59,59,999);
  }
  return { start, end };
};

export default function CategorySummary({ defaultPeriod = 'month' }) {
  const [period, setPeriod] = useState(defaultPeriod);
  const [refDate, setRefDate] = useState(new Date().toISOString().slice(0,10));
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { start, end } = computeRange(period, refDate, customFrom, customTo);
      const params = { type: 'expense' };
      if (start) params.start = start.toISOString();
      if (end) params.end = end.toISOString();

      const res = await axios.get('/api/reports/category-summary', { params });
      setData(res.data || []);
    } catch (err) {
      console.error('Category summary load failed', err);
      alert('Failed to load category summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period, refDate, customFrom, customTo]);

  const labels = data.map(d => d.category);
  const totals = data.map(d => Math.abs(d.total || 0)); // ensure positive numbers for chart

  const chartData = {
    labels,
    datasets: [{
      label: 'Total',
      data: totals,
      backgroundColor: 'rgba(54,162,235,0.6)'
    }]
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h5 className="card-title">Spending by Category</h5>

        <div className="row g-2 align-items-end mb-3">
          <div className="col-auto">
            <label className="form-label small">Period</label>
            <select className="form-select" value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
              <option value="all">All</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {period !== 'all' && period !== 'custom' && (
            <div className="col-auto">
              <label className="form-label small">Reference date</label>
              <input type="date" className="form-control" value={refDate} onChange={e=>setRefDate(e.target.value)} />
            </div>
          )}

          {period === 'custom' && (
            <>
              <div className="col-auto">
                <label className="form-label small">From</label>
                <input type="date" className="form-control" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} />
              </div>
              <div className="col-auto">
                <label className="form-label small">To</label>
                <input type="date" className="form-control" value={customTo} onChange={e=>setCustomTo(e.target.value)} />
              </div>
            </>
          )}

          <div className="col-auto">
            <button className="btn btn-primary" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
          </div>
        </div>

        <div style={{minHeight:120}}>
          {data.length ? (
            <>
              <div className="row">
                <div className="col-md-6">
                  <Bar data={chartData} options={{ responsive:true, plugins:{legend:{display:false}} }} />
                </div>
                <div className="col-md-6">
                  <table className="table table-sm">
                    <thead><tr><th>Category</th><th className="text-end">Total</th></tr></thead>
                    <tbody>
                      {data.map(r => (
                        <tr key={r.category}>
                          <td>{r.category}</td>
                          <td className="text-end">{fmt(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-muted">No data for selected period.</div>
          )}
        </div>
      </div>
    </div>
  );
}