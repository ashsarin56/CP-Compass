const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const db = require('./config/db');
const app = express();
const PORT = process.env.PORT||3000;

app.use(cors({ origin: 'http://localhost:5173' })); 
app.use(express.json());
app.use('/auth', require('./routes/auth'));
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api',require('./routes/index'));

app.listen(PORT,() => {
  console.log(`CP Compass server running on port ${PORT}`);
});

module.exports=app;