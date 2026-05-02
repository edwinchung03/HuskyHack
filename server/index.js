const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const entriesRouter   = require('./routes/entries');
const decisionsRouter = require('./routes/decisions');
const aiRouter        = require('./routes/ai');
const uploadRouter    = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://husky-hack-3923.vercel.app'
  ]
}));

app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/entries',   entriesRouter);
app.use('/api/decisions', decisionsRouter);
app.use('/api/ai',        aiRouter);
app.use('/api/upload', uploadRouter);

app.listen(PORT, () => {
  console.log(`🐾 HuskyDiary server running on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) console.warn('⚠  GEMINI_API_KEY not set — AI features will fail until it is configured');
  if (!process.env.BACKBOARD_API_KEY) console.warn('⚠  BACKBOARD_API_KEY not set — AI memory features disabled');
});
