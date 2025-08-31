import React, { useState, useEffect } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function TransactionAnalytics({ transactions }) {
  const [filteredTransactions, setFilteredTransactions] = useState(transactions);
  const [dateRange, setDateRange] = useState('month');
  const [categoryTotals, setCategoryTotals] = useState({});
  const [monthlySpending, setMonthlySpending] = useState([]);

  // Filter options
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'all',
    category: 'all',
    minAmount: '',
    maxAmount: ''
  });

  useEffect(() => {
    applyFilters();
    calculateCategoryTotals();
    calculateMonthlySpending();
  }, [transactions, filters, dateRange]);

  const applyFilters = () => {
    let filtered = [...transactions];

    if (filters.startDate) {
      filtered = filtered.filter(t => new Date(t.date) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      filtered = filtered.filter(t => new Date(t.date) <= new Date(filters.endDate));
    }
    if (filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }
    if (filters.category !== 'all') {
      filtered = filtered.filter(t => t.category === filters.category);
    }
    if (filters.minAmount) {
      filtered = filtered.filter(t => t.amount >= parseFloat(filters.minAmount));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(t => t.amount <= parseFloat(filters.maxAmount));
    }

    setFilteredTransactions(filtered);
  };

  const calculateCategoryTotals = () => {
    const totals = {};
    filteredTransactions.forEach(t => {
      if (t.type === 'expense') {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
      }
    });
    setCategoryTotals(totals);
  };

  const calculateMonthlySpending = () => {
    const monthly = {};
    filteredTransactions.forEach(t => {
      if (t.type === 'expense') {
        const date = new Date(t.date);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        monthly[key] = (monthly[key] || 0) + t.amount;
      }
    });

    const sorted = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);

    setMonthlySpending(sorted);
  };

  const spendingChartData = {
    labels: monthlySpending.map(([month]) => month),
    datasets: [
      {
        label: 'Monthly Spending',
        data: monthlySpending.map(([, amount]) => amount),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const categoryChartData = {
    labels: Object.keys(categoryTotals),
    datasets: [
      {
        data: Object.values(categoryTotals),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
      },
    ],
  };

  const uniqueCategories = [...new Set(transactions.map(t => t.category))];

  return (
    <div className="mt-4">
      <h3>Transaction Analytics</h3>
      
      <div className="card mb-4">
        <div className="card-body">
          <h4>Filters</h4>
          <div className="row">
            <div className="col-md-2">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={filters.startDate}
                onChange={e => setFilters({...filters, startDate: e.target.value})}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-control"
                value={filters.endDate}
                onChange={e => setFilters({...filters, endDate: e.target.value})}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Type</label>
              <select
                className="form-control"
                value={filters.type}
                onChange={e => setFilters({...filters, type: e.target.value})}
              >
                <option value="all">All</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Category</label>
              <select
                className="form-control"
                value={filters.category}
                onChange={e => setFilters({...filters, category: e.target.value})}
              >
                <option value="all">All</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Min Amount</label>
              <input
                type="number"
                className="form-control"
                value={filters.minAmount}
                onChange={e => setFilters({...filters, minAmount: e.target.value})}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Max Amount</label>
              <input
                type="number"
                className="form-control"
                value={filters.maxAmount}
                onChange={e => setFilters({...filters, maxAmount: e.target.value})}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h4>Monthly Spending Trend</h4>
              <Line data={spendingChartData} />
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h4>Spending by Category</h4>
              <Pie data={categoryChartData} />
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-body">
          <h4>Filtered Transactions</h4>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(t => (
                  <tr key={t._id}>
                    <td>{new Date(t.date).toLocaleDateString()}</td>
                    <td>{t.description}</td>
                    <td>{t.category}</td>
                    <td>
                      <span className={`badge ${t.type === 'income' ? 'bg-success' : 'bg-danger'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td>${t.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransactionAnalytics; 