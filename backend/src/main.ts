import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';

import bookRoutes from './routes/books';
import noteRoutes from './routes/notes';
import folderRoutes from './routes/folders';
import tagRoutes from './routes/tags';
import inconsistenciesRouter from './routes/inconsistencies';
import searchRouter from './routes/search';
import linksRouter from './routes/links';
import settingsRouter from './routes/settings';

const app = express();

// ===========================
// Security Middleware
// ===========================
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Rate limit all routes generally
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for stability
  message: { error: 'Too many requests, please try again later.' },
}));

// Tighter rate limit on AI endpoints to protect API budget
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'AI rate limit exceeded. Please wait a moment.' },
});

// ===========================
// Routes
// ===========================
app.use('/api', bookRoutes);
app.use('/api', noteRoutes);
app.use('/api', folderRoutes);
app.use('/api', tagRoutes);
app.use('/api', inconsistenciesRouter);
app.use('/api', searchRouter);
app.use('/api', linksRouter);           // handles /notes/:id/links, /links/:id
app.use('/api/settings', settingsRouter); // handles global configurations

// Apply AI rate limiter specifically to AI endpoints
app.use('/api/notes/:id/check-consistency', aiRateLimit);
app.use('/api/notes/:id/suggest-tags', aiRateLimit);
app.use('/api/notes/:id/suggest-links', aiRateLimit);
app.use('/api/books/:id/analyze-interactions', aiRateLimit);
app.use('/api/books/:id/analyze-themes', aiRateLimit);
app.use('/api/books/:id/pacing', aiRateLimit);
app.use('/api/books/:id/loose-ends', aiRateLimit);
app.use('/api/notes/:id/beta-read', aiRateLimit);


// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ===========================
// Start Server
// ===========================
app.listen(config.port, () => {
  console.log(`\n🚀 Book Manager Pro v2 Backend`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Server:      http://localhost:${config.port}`);
  console.log(`   Health:      http://localhost:${config.port}/health\n`);
});
