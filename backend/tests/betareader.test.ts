import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import noteRoutes from '../src/routes/notes';
import { PrismaClient } from '@prisma/client';
import * as aiService from '../src/services/ai';

vi.mock('@prisma/client', () => {
  const mPrismaClient = {
    note: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    folder: { findUnique: vi.fn() },
    tag: { upsert: vi.fn() },
    tagsOnNotes: { upsert: vi.fn(), delete: vi.fn() }
  };
  return { 
    PrismaClient: class {
      note = mPrismaClient.note;
      folder = mPrismaClient.folder;
      tag = mPrismaClient.tag;
      tagsOnNotes = mPrismaClient.tagsOnNotes;
    }
  };
});

vi.mock('../src/services/ai', () => ({
  getBetaReaderFeedback: vi.fn(),
  checkConsistency: vi.fn(),
  suggestTags: vi.fn()
}));

const app = express();
app.use(express.json());
app.use('/api', noteRoutes);

describe('POST /api/notes/:id/beta-read', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
  });

  it('should return 404 if note does not exist', async () => {
    (prisma.note.findUnique as any).mockResolvedValue(null);
    const response = await request(app).post('/api/notes/999/beta-read');
    expect(response.status).toBe(404);
  });

  it('should return 400 if note content is too short', async () => {
    (prisma.note.findUnique as any).mockResolvedValue({ content: 'short' });
    const response = await request(app).post('/api/notes/1/beta-read');
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('too short');
  });

  it('should return feedback for valid note', async () => {
    (prisma.note.findUnique as any).mockResolvedValue({ content: 'valid long content to analyze' });
    
    const mockFeedback = {
      strengths: ['Great!'],
      weaknesses: ['None!'],
      emotional_impact: 'Strong.',
      pacing_notes: 'Fast.'
    };
    (aiService.getBetaReaderFeedback as any).mockResolvedValue(mockFeedback);
    
    const response = await request(app).post('/api/notes/1/beta-read');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockFeedback);
  });
});
