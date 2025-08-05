const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 5000;

// Enable CORS
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use(bodyParser.json()); 

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/financial_dashboard', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1); // Exit if MongoDB connection fails
  });

// Function to create a default user if none exists
const createDefaultUser = async () => {
  try {
    // Temporarily define User model here if it's not accessible yet
    const userSchema = new mongoose.Schema({
      username: String,
      password: String,
    });
    const User = mongoose.model('User', userSchema);

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('No users found. Creating default admin user...');
      const defaultUser = new User({ username: 'admin', password: 'password' });
      await defaultUser.save();
      console.log('Default user created. Username: admin, Password: password');
    }
  } catch (error) {
    console.error('Error creating default user:', error);
  }
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Financial account schema
const accountSchema = new mongoose.Schema({
  userId: String,
  name: String,
  type: {
    type: String,
    enum: [
      'checking', 
      'savings', 
      'retirement', 
      'investment', 
      'credit', 
      'term deposit', 
      'super',
      'cash',
      'transaction',
      'everyday',
      'loan',
      'mortgage'
    ].map(t => t.toLowerCase())  // Convert all to lowercase for consistency
  },
  balance: Number,
  lastUpdated: Date,
  bsb: String,
  accountNumber: String,
  marketValue: Number,
  openingDate: { type: Date, required: false },
  closingDate: { type: Date, required: false }
});

// Transaction schema
const transactionSchema = new mongoose.Schema({
  userId: String,
  accountId: String,
  date: Date,
  description: String,
  amount: Number,
  category: String,
  type: {
    type: String,
    enum: ['income', 'expense', 'transfer']
  }
});

const Account = mongoose.model('Account', accountSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

// User schema and model
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const User = mongoose.model('User', userSchema);

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Received login request:', username, password);

  const user = await User.findOne({ username, password });
  if (user) {
    res.send({ success: true });
  } else {
    res.send({ success: false });
  }
});

// Account endpoints
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.query.userId });
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

app.post('/api/accounts', async (req, res) => {
  try {
    console.log('Creating account with data:', req.body);
    
    const parseDate = (dateStr) => {
      if (!dateStr) return undefined;
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) ? date : undefined;
    };
    
    const account = new Account({
      ...req.body,
      lastUpdated: new Date(),
      openingDate: parseDate(req.body.openingDate),
      closingDate: parseDate(req.body.closingDate),
      balance: parseFloat(req.body.balance || 0),
      marketValue: parseFloat(req.body.marketValue || 0)
    });
    
    // Remove undefined dates to prevent validation errors
    if (!account.openingDate) delete account.openingDate;
    if (!account.closingDate) delete account.closingDate;
    
    console.log('Normalized account data:', account);
    await account.save();
    res.json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        console.error(`Validation error for ${key}:`, error.errors[key]);
      });
    }
    res.status(500).json({ 
      error: 'Failed to create account', 
      details: error.message 
    });
  }
});

// Transaction endpoints
app.get('/api/transactions', async (req, res) => {
  const transactions = await Transaction.find({ userId: req.query.userId });
  res.json(transactions);
});

app.post('/api/transactions', async (req, res) => {
  try {
    const transaction = new Transaction({
      ...req.body,
      date: new Date(req.body.date)
    });
    await transaction.save();
    
    // Update account balance
    const account = await Account.findById(req.body.accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    account.balance += req.body.type === 'expense' ? -req.body.amount : req.body.amount;
    account.lastUpdated = new Date();
    await account.save();
    
    res.json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ 
      error: 'Failed to create transaction', 
      details: error.message 
    });
  }
});

// Admin endpoints
app.post('/api/admin/clear-database', async (req, res) => {
  try {
    const { password } = req.body;
    
    // In production, use environment variable and proper hashing
    if (password !== 'admin123') {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Clear all collections
    await Promise.all([
      Account.deleteMany({}),
      Transaction.deleteMany({})
    ]);
    
    res.json({ success: true, message: 'Database cleared successfully' });
  } catch (error) {
    console.error('Error clearing database:', error);
    res.status(500).json({ error: 'Failed to clear database' });
  }
});

// Serve index.html
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public', 'index.html')));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
