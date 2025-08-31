import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TransactionAnalytics from './TransactionAnalytics';
import BankImport from './BankImport';
import AdminPanel from './AdminPanel';
import CategorySummary from './CategorySummary';

function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'checking',
    balance: 0
  });
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    accountId: '',
    description: '',
    amount: 0,
    type: 'expense',
    category: ''
  });
  const [showImport, setShowImport] = useState(false);

  const normalizeAccountType = (type) => {
    const typeMap = {
      'Cash': 'cash',
      'Transaction': 'checking',
      'Everyday': 'checking',
      'Savings Account': 'savings',
      'Term Deposit Account': 'term deposit',
      'Credit Card': 'credit',
      'Loan': 'loan',
      'Mortgage': 'mortgage',
      // Add more mappings as needed
    };
    
    const normalizedType = typeMap[type] || type.toLowerCase();
    return normalizedType;
  };

  useEffect(() => {
    // Fetch accounts and transactions
    const fetchData = async () => {
      const userId = localStorage.getItem('userId'); // Assuming you store userId after login
      const [accountsRes, transactionsRes] = await Promise.all([
        axios.get(`/api/accounts?userId=${userId}`),
        axios.get(`/api/transactions?userId=${userId}`)
      ]);
      
      setAccounts(accountsRes.data);
      setTransactions(transactionsRes.data);
      setTotalBalance(accountsRes.data.reduce((sum, acc) => sum + acc.balance, 0));
    };

    fetchData();
  }, []);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.post('/api/accounts', {
        ...newAccount,
        userId,
        balance: parseFloat(newAccount.balance)
      });
      
      setAccounts([...accounts, response.data]);
      setTotalBalance(totalBalance + parseFloat(newAccount.balance));
      setShowAddAccount(false);
      setNewAccount({ name: '', type: 'checking', balance: 0 });
    } catch (error) {
      console.error('Error adding account:', error);
      alert('Failed to add account');
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.post('/api/transactions', {
        ...newTransaction,
        userId,
        amount: parseFloat(newTransaction.amount),
        date: new Date()
      });
      
      setTransactions([response.data, ...transactions]);
      setShowAddTransaction(false);
      setNewTransaction({
        accountId: '',
        description: '',
        amount: 0,
        type: 'expense',
        category: ''
      });
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction');
    }
  };

  const handleImport = async (importedData, importType) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        alert('Please log in first');
        return;
      }

      if (importType === 'accounts') {
        // Import accounts first
        const accountPromises = importedData.map(async (account) => {
          const existingAccount = accounts.find(a => 
            a.bsb === account.bsb && 
            a.accountNumber === account.accountNumber
          );
          
          if (existingAccount) {
            return existingAccount;
          }
          
          const response = await axios.post('/api/accounts', {
            ...account,
            userId,
          });
          return response.data;
        });
        
        const newAccounts = await Promise.all(accountPromises);
        setAccounts([...accounts, ...newAccounts.filter(a => !accounts.find(existing => 
          existing._id === a._id
        ))]);
        
        alert('Accounts imported successfully!');
      } else {
        // Import transactions
        const accountMap = new Map();
        
        // Group transactions by account
        importedData.forEach(transaction => {
          const key = `${transaction.accountIdentifier.bsb}-${transaction.accountIdentifier.accountNumber}`;
          if (!accountMap.has(key)) {
            accountMap.set(key, []);
          }
          accountMap.get(key).push(transaction);
        });
        
        // Process each account's transactions
        for (const [accountKey, transactions] of accountMap) {
          const [bsb, accountNumber] = accountKey.split('-');
          let account = accounts.find(a => a.bsb === bsb && a.accountNumber === accountNumber);
          
          if (!account) {
            // Create account if it doesn't exist
            const newAccount = await axios.post('/api/accounts', {
              userId,
              name: `Account ${accountNumber}`,
              type: 'checking',
              bsb,
              accountNumber,
              balance: transactions[transactions.length - 1].balance,
              lastUpdated: new Date()
            });
            account = newAccount.data;
            setAccounts([...accounts, account]);
          }
          
          // Import transactions for this account
          const transactionPromises = transactions.map(t => 
            axios.post('/api/transactions', {
              userId,
              accountId: account._id,
              date: new Date(t.date),
              description: t.description,
              amount: Math.abs(t.amount),
              type: t.type,
              category: t.category
            })
          );
          
          const responses = await Promise.all(transactionPromises);
          setTransactions(prev => [...responses.map(r => r.data), ...prev]);
        }
        
        alert('Transactions imported successfully!');
      }
      
      setShowImport(false);
    } catch (error) {
      console.error(`Error importing ${importType}:`, error);
      alert(`Failed to import ${importType}: ${error.message}`);
    }
  };

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-between align-items-center">
        <h1>Financial Dashboard</h1>
        <div>
          <button 
            className="btn btn-primary me-2" 
            onClick={() => setShowAddAccount(!showAddAccount)}
          >
            Add Account
          </button>
          <button 
            className="btn btn-success me-2" 
            onClick={() => setShowAddTransaction(!showAddTransaction)}
          >
            Add Transaction
          </button>
          <button 
            className="btn btn-info me-2" 
            onClick={() => setShowImport(!showImport)}
          >
            Import Transactions
          </button>
          <AdminPanel />
        </div>
      </div>

      {showImport && (
        <div className="card mt-3">
          <div className="card-body">
            <h3>Import Transactions</h3>
            <p className="text-muted">
              Upload a CSV file with columns: Date, Description, Amount
              <br />
              Amount should be positive for income and negative for expenses
            </p>
            <BankImport onImport={handleImport} />
          </div>
        </div>
      )}

      {showAddAccount && (
        <div className="card mt-3">
          <div className="card-body">
            <h3>Add New Account</h3>
            <form onSubmit={handleAddAccount}>
              <div className="mb-3">
                <label className="form-label">Account Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Account Type</label>
                <select
                  className="form-control"
                  value={newAccount.type}
                  onChange={(e) => setNewAccount({...newAccount, type: e.target.value})}
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="retirement">Retirement</option>
                  <option value="investment">Investment</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Initial Balance</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={newAccount.balance}
                  onChange={(e) => setNewAccount({...newAccount, balance: e.target.value})}
                  required
                />
              </div>
              <button type="submit" className="btn btn-success">Add Account</button>
              <button 
                type="button" 
                className="btn btn-secondary ms-2"
                onClick={() => setShowAddAccount(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {showAddTransaction && (
        <div className="card mt-3">
          <div className="card-body">
            <h3>Add New Transaction</h3>
            <form onSubmit={handleAddTransaction}>
              <div className="mb-3">
                <label className="form-label">Account</label>
                <select
                  className="form-control"
                  value={newTransaction.accountId}
                  onChange={(e) => setNewTransaction({...newTransaction, accountId: e.target.value})}
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map(account => (
                    <option key={account._id} value={account._id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-control"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Type</label>
                <select
                  className="form-control"
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  className="form-control"
                  value={newTransaction.category}
                  onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                  required
                />
              </div>
              <button type="submit" className="btn btn-success">Add Transaction</button>
              <button 
                type="button" 
                className="btn btn-secondary ms-2"
                onClick={() => setShowAddTransaction(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="row mt-4">
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Total Balance</h5>
              <h2>${totalBalance.toFixed(2)}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-md-6">
          <h3>Accounts</h3>
          <div className="list-group">
            {accounts.map(account => (
              <div key={account._id} className="list-group-item">
                <h5>{account.name}</h5>
                <p className="mb-1">Type: {account.type}</p>
                <p className="mb-0">Balance: ${account.balance.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="col-md-6">
          <h3>Recent Transactions</h3>
          <div className="list-group">
            {transactions.slice(0, 5).map(transaction => (
              <div key={transaction._id} className="list-group-item">
                <h5>{transaction.description}</h5>
                <p className="mb-1">
                  Amount: ${transaction.amount.toFixed(2)}
                  <span className={`badge ms-2 ${
                    transaction.type === 'income' ? 'bg-success' : 'bg-danger'
                  }`}>
                    {transaction.type}
                  </span>
                </p>
                <p className="mb-0">Date: {new Date(transaction.date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TransactionAnalytics transactions={transactions} />
      <CategorySummary />
    </div>
  );
}

export default Dashboard;
