const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use(bodyParser.json()); 

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/financial_dashboard', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

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

// Serve index.html
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public', 'index.html')));

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
