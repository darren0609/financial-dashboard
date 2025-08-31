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

// -- Category schema & model
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  matchType: { type: String, enum: ['contains','startsWith','regex'], default: 'contains' },
  pattern: { type: String, required: true }, // for 'contains' use comma-separated keywords
  priority: { type: Number, default: 0 } // higher = evaluated first
});
const Category = mongoose.model('Category', categorySchema);

// Helper: categorize a single transaction using categories
const categorizeTransaction = (tx, categories) => {
  if (!tx || !tx.description) return tx;
  const desc = (tx.description || '').toLowerCase();

  // sort categories by priority desc
  const sorted = categories.slice().sort((a,b) => b.priority - a.priority);
  for (const cat of sorted) {
    const p = (cat.pattern || '').toLowerCase();
    if (cat.matchType === 'regex') {
      try {
        const re = new RegExp(p, 'i');
        if (re.test(tx.description)) {
          return cat.name;
        }
      } catch (e) {
        continue;
      }
    } else if (cat.matchType === 'startsWith') {
      if (desc.startsWith(p)) return cat.name;
    } else { // contains: allow comma-separated tokens
      const tokens = p.split(',').map(s => s.trim()).filter(Boolean);
      if (tokens.some(t => desc.includes(t))) return cat.name;
    }
  }
  return tx.category || 'Uncategorized';
};

// Seed sensible default categories (run once at startup)
const seedDefaultCategories = async () => {
  try {
    const count = await Category.countDocuments();
    if (count === 0) {
      const defaults = [
        { name: 'Groceries', matchType: 'contains', pattern: 'coles,woolworths,aldi,iga', priority: 100 },
        { name: 'Fuel', matchType: 'contains', pattern: 'bp,shell,caltex,ampol,coles express', priority: 90 },
        { name: 'Eating Out', matchType: 'contains', pattern: 'sq *,starbucks,mc donald,mcdonalds,kfc', priority: 80 },
        { name: 'Square - Misc', matchType: 'startsWith', pattern: 'sq *', priority: 70 },
        { name: 'Salary', matchType: 'contains', pattern: 'payroll,salary,pay', priority: 100 },
        { name: 'Utilities', matchType: 'contains', pattern: 'electricity,water,gas,origin,ato', priority: 60 }
      ];
      await Category.insertMany(defaults);
      console.log('Inserted default categories');
    }
  } catch (err) {
    console.error('Error seeding categories:', err);
  }
};

// call after successful DB connect
mongoose.connection.once('open', () => {
  seedDefaultCategories().catch(() => {});
});

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
    const txData = {
      ...req.body,
      date: new Date(req.body.date || Date.now()),
    };

    // load categories and set category
    const categories = await Category.find({});
    txData.category = categorizeTransaction(txData, categories);

    const transaction = new Transaction(txData);
    await transaction.save();

    // Update account balance logic (existing)
    const account = await Account.findById(req.body.accountId);
    if (!account) throw new Error('Account not found');
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

// Update a single transaction (allow updating category / description / amount)
app.put('/api/transactions/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.category !== undefined) updates.category = req.body.category;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.amount !== undefined) updates.amount = req.body.amount;
    if (req.body.type !== undefined) updates.type = req.body.type;

    const tx = await Transaction.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    res.json(tx);
  } catch (err) {
    console.error('Error updating transaction:', err);
    res.status(500).json({ error: err.message });
  }
});

// Return uncategorized or ambiguous "Square" transactions for quick manual labelling
app.get('/api/transactions/uncategorized', async (req, res) => {
  try {
    const { userId, mode } = req.query; // mode: 'uncategorized' | 'sq' | 'both'
    const onlyMode = (mode || 'both').toLowerCase();
    const filter = {};

    if (onlyMode === 'uncategorized') {
      // only items with no category assigned
      filter.category = { $in: [null, '', 'OTHER'] };
    } else if (onlyMode === 'sq') {
      // only SQ* items
      filter.$or = [
        { description: { $regex: '^\\s*sq\\s*\\*', $options: 'i' } },
        { description: { $regex: '^\\s*sq\\s', $options: 'i' } }
      ];
    } else {
      // default: both uncategorized and SQ*
      filter.$or = [
        { category: { $in: [null, '', 'Uncategorized'] } },
        { description: { $regex: '^\\s*sq\\s*\\*', $options: 'i' } },
        { description: { $regex: '^\\s*sq\\s', $options: 'i' } }
      ];
    }

    if (userId) filter.userId = userId;
    const txs = await Transaction.find(filter).sort({ date: -1 }).limit(500);
    res.json(txs);
  } catch (err) {
    console.error('Error fetching uncategorized transactions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Optional: run a retag across DB using current category rules
app.post('/api/admin/retag-transactions', async (req, res) => {
  try {
    const { userId } = req.body || {};
    const categories = await Category.find({});
    const filter = userId ? { userId } : {};
    const txs = await Transaction.find(filter);
    let updated = 0;
    const ops = [];
    txs.forEach(tx => {
      const newCat = categorizeTransaction(tx, categories);
      if ((tx.category || '') !== (newCat || '')) {
        ops.push(Transaction.updateOne({ _id: tx._id }, { $set: { category: newCat } }));
        updated++;
      }
    });
    if (ops.length) await Promise.all(ops);
    res.json({ success: true, updated });
  } catch (err) {
    console.error('Retag error:', err);
    res.status(500).json({ error: err.message });
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

// Categories management endpoints
app.get('/api/categories', async (req, res) => {
  const categories = await Category.find({}).sort({ priority: -1, name: 1 });
  res.json(categories);
});

app.post('/api/categories', async (req, res) => {
  try {
    const cat = new Category(req.body);
    await cat.save();
    res.json(cat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Re-tag all transactions (optionally limit by userId) - admin action
app.post('/api/admin/retag-transactions', async (req, res) => {
  try {
    const { userId } = req.body; // optional
    const categories = await Category.find({});
    const filter = userId ? { userId } : {};
    const txs = await Transaction.find(filter);
    const ops = txs.map(tx => {
      const newCat = categorizeTransaction(tx, categories);
      if (newCat !== tx.category) {
        return Transaction.updateOne({ _id: tx._id }, { $set: { category: newCat } });
      }
      return null;
    }).filter(Boolean);
    if (ops.length) await Promise.all(ops);
    res.json({ success: true, updated: ops.length });
  } catch (err) {
    console.error('Retag error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Category summary report
app.get('/api/reports/category-summary', async (req, res) => {
  try {
    const { userId, start, end, type } = req.query; // type=expense|income|all
    const match = {};
    if (userId) match.userId = userId;
    if (start || end) match.date = {};
    if (start) match.date.$gte = new Date(start);
    if (end) match.date.$lte = new Date(end);
    if (type && (type === 'expense' || type === 'income')) match.type = type;

    const pipeline = [
      { $match: match },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ];
    const result = await Transaction.aggregate(pipeline);
    res.json(result.map(r => ({ category: r._id || 'Uncategorized', total: r.total, count: r.count })));
  } catch (err) {
    console.error('Category summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Return transactions that match multiple category rules (conflicts)
app.get('/api/transactions/conflicts', async (req, res) => {
  try {
    const { userId } = req.query;
    const categories = await Category.find({}).sort({ priority: -1 });
    const filter = userId ? { userId } : {};
    const txs = await Transaction.find(filter).sort({ date: -1 }).limit(500);

    const evalMatch = (tx, cat) => {
      const desc = (tx.description || '').toLowerCase();
      const p = (cat.pattern || '').toLowerCase();
      if (cat.matchType === 'regex') {
        try { return new RegExp(p, 'i').test(tx.description); } catch { return false; }
      } else if (cat.matchType === 'startsWith') {
        return desc.startsWith(p);
      } else { // contains (comma-separated)
        return p.split(',').map(s=>s.trim()).filter(Boolean).some(t => desc.includes(t));
      }
    };

    const conflicts = [];
    for (const tx of txs) {
      const matches = categories.filter(c => evalMatch(tx, c)).map(c => c.name);
      if (matches.length > 1) {
        conflicts.push({
          transaction: tx,
          matches
        });
      }
    }

    res.json(conflicts);
  } catch (err) {
    console.error('Error fetching conflicts:', err);
    res.status(500).json({ error: err.message });
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

// Return summary of normalized descriptions (count, sample, categories seen)
app.get('/api/reports/description-summary', async (req, res) => {
  try {
    const { userId, limit = 200 } = req.query;
    const match = { description: { $exists: true, $ne: '' } };
    if (userId) match.userId = userId;

    const pipeline = [
      { $match: match },
      { $project: {
          norm: { $trim: { input: { $toLower: '$description' } } },
          description: '$description',
          category: '$category',
          amount: '$amount',
          date: '$date'
      }},
      { $group: {
          _id: '$norm',
          count: { $sum: 1 },
          sample: { $first: '$description' },
          categories: { $addToSet: '$category' },
          avgAmount: { $avg: '$amount' }
      }},
      { $sort: { count: -1 } },
      { $limit: parseInt(limit, 10) }
    ];

    const rows = await Transaction.aggregate(pipeline);
    const mapped = rows.map(r => ({
      normalized: r._id,
      sample: r.sample,
      count: r.count,
      categories: (r.categories || []).filter(Boolean),
      avgAmount: r.avgAmount || 0
    }));

    res.json(mapped);
  } catch (err) {
    console.error('description-summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// helper to escape regex
const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Create a Category rule from a list of descriptions (builds a regex) - improved validation + diagnostics
app.post('/api/admin/create-category-from-descriptions', async (req, res) => {
  try {
    const { descriptions = [], name, priority = 50 } = req.body || {};
    console.log('create-category-from-descriptions called', { count: Array.isArray(descriptions) ? descriptions.length : 0, name, priority });

    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!Array.isArray(descriptions) || descriptions.length === 0) return res.status(400).json({ error: 'descriptions required (non-empty array)' });

    // limit to avoid over-long regex
    const MAX_DESCRIPTIONS = 200;
    if (descriptions.length > MAX_DESCRIPTIONS) {
      return res.status(400).json({ error: `Too many descriptions (max ${MAX_DESCRIPTIONS}). Reduce selection and try again.` });
    }

    // build safe regex parts
    const parts = descriptions.map(d => {
      if (typeof d !== 'string') return '';
      const t = (d || '').trim();
      return t ? escapeRegex(t) : '';
    }).filter(Boolean);

    if (!parts.length) return res.status(400).json({ error: 'no valid descriptions after trimming' });

    // construct anchored regex matching any of the exact description texts (case-insensitive)
    const pattern = parts.length === 1 ? `^\\s*${parts[0]}\\s*$` : `^\\s*(?:${parts.join('|')})\\s*$`;

    // extra safety: cap total pattern length
    const MAX_PATTERN_LENGTH = 10000;
    if (pattern.length > MAX_PATTERN_LENGTH) {
      return res.status(400).json({ error: `Generated pattern is too long (${pattern.length} chars). Select fewer descriptions or create multiple rules.` });
    }

    // upsert a category with regex match
    const catData = { name, matchType: 'regex', pattern, priority };
    let cat;
    const existing = await Category.findOne({ name });
    if (existing) {
      existing.matchType = 'regex';
      existing.pattern = pattern;
      existing.priority = priority;
      cat = await existing.save();
    } else {
      cat = new Category(catData);
      await cat.save();
    }

    console.log('Created/updated category from descriptions', { name: cat.name, id: cat._id });
    res.json({ success: true, category: cat });

  } catch (err) {
    console.error('create-category-from-descriptions ERROR:', err);
    res.status(500).json({ error: 'Server error creating category', details: err.message });
  }
});
