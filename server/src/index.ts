import express from 'express';
import cors from 'cors';
import { success } from './utils/response.js';

const app = express();
const PORT = process.env.PORT || 9700;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json(success({ status: 'ok', timestamp: new Date().toISOString() }));
});

// Root
app.get('/', (req, res) => {
  res.json(success({ service: 'TeamClaw Server', version: '0.1.0' }));
});

app.listen(PORT, () => {
  console.log(`TeamClaw server running on port ${PORT}`);
});

export default app;
