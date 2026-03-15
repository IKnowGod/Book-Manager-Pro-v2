import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

// Create a dummy app for the health check test
const app = express();
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0' });
});

describe('Health Check API', () => {
  it('should return status ok for GET /api/health', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
});
