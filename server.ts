import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = 3000;

// 1. CORS Configuration (Keep only one!)
app.use(cors({
  origin: 'https://pulse-feeds.surge.sh',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// 2. Body Parsers
app.use(express.json());

// 3. Debug Logger
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// 4. Routes (Add your payout/reward routes here)
app.get('/api/payout/platform', (req, res) => {
  res.json({ status: 'alive' });
});

// 5. Static Files & Catch-all (for Surge/Vite)
const frontendDistPath = path.join(process.cwd(), 'dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// 6. Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
