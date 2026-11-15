import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessions.js';
import analyticsRoutes from './routes/analytics.js';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const app = express();
const port = Number(process.env.PORT) || 4000;

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing. Copy .env.example to .env in the project root and set a long random secret.');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing. Set it in the project root .env file.');

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '20kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` }));
app.use((error, _req, res, _next) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: error.message });
  }
  console.error(error);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

try {
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => console.log(`Study Time Tracker API listening on http://localhost:${port}`));
} catch (error) {
  console.error('Unable to connect to MongoDB:', error.message);
  if (/bad auth|authentication failed/i.test(error.message)) {
    console.error('Check the MongoDB database username and password in the root .env file, confirm the database user has access to this cluster, and URL-encode any reserved characters in the password.');
  }
  process.exitCode = 1;
}
