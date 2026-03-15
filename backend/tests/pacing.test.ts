import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bookRoutes from '../src/routes/books';
// We need to mock the prisma and AI service
import { PrismaClient } from '@prisma/client';
import * as aiService from '../src/services/ai';
import { encodeId } from '../src/utils/idEncoder';

vi.mock('@prisma/client', () => {
  const mPrismaClient = {
    note: { findMany: vi.fn() },
    book: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
    tag: { count: vi.fn() },
    inconsistency: { count: vi.fn() }
  };
  return { 
    PrismaClient: class {
      note = mPrismaClient.note;
      book = mPrismaClient.book;
      tag = mPrismaClient.tag;
      inconsistency = mPrismaClient.inconsistency;
    }
  };
});

vi.mock('../src/services/ai', () => ({
  analyzePacing: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api', bookRoutes);

describe('GET /api/books/:id/pacing', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
  });

  it('should return 400 if no chapters exist', async () => {
    (prisma.note.findMany as any).mockResolvedValue([]);
    
    const validId = encodeId(1);
    const response = await request(app).get(`/api/books/${validId}/pacing`);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Need at least 1 chapter');
  });

  it('should return pacing scores for chapters', async () => {
    const mockChapters = [
      { title: 'Chapter 1', content: 'content 1' },
      { title: 'Chapter 2', content: 'content 2' }
    ];
    (prisma.note.findMany as any).mockResolvedValue(mockChapters);
    
    const mockScores = [
      { chapter: 'Chapter 1', intensity: 4 },
      { chapter: 'Chapter 2', intensity: 8 }
    ];
    (aiService.analyzePacing as any).mockResolvedValue(mockScores);
    
    const validId = encodeId(1);
    const response = await request(app).get(`/api/books/${validId}/pacing`);
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockScores);
    expect(aiService.analyzePacing).toHaveBeenCalledWith(mockChapters, expect.any(Object));
  });
});
