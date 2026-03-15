import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { encodeId, decodeId } from '../utils/idEncoder';
import { analyzeInteractions, analyzeThemes, analyzePacing, scanForLooseEnds } from '../services/ai';

const router = Router();
const prisma = new PrismaClient();

const BookCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
});

const BookUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

// POST /books
router.post('/books', async (req: Request, res: Response) => {
  const parsed = BookCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const book = await prisma.book.create({ data: { title: parsed.data.title } });
    return res.status(201).json({ ...book, id: encodeId(book.id) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create book' });
  }
});

// GET /books
router.get('/books', async (_req: Request, res: Response) => {
  try {
    const books = await prisma.book.findMany({ orderBy: { createdAt: 'desc' } });
    const result = await Promise.all(
      books.map(async (book) => {
        const noteCount = await prisma.note.count({ where: { bookId: book.id } });
        return { ...book, id: encodeId(book.id), noteCount };
      })
    );
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// GET /books/:id
router.get('/books/:id', async (req: Request, res: Response) => {
  try {
    const bookId = decodeId(req.params.id);
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) return res.status(404).json({ error: 'Book not found' });
    const noteCount = await prisma.note.count({ where: { bookId: book.id } });
    return res.json({ ...book, id: encodeId(book.id), noteCount });
  } catch {
    return res.status(400).json({ error: 'Invalid book ID' });
  }
});

// GET /books/:id/stats
router.get('/books/:id/stats', async (req: Request, res: Response) => {
  try {
    const bookId = decodeId(req.params.id);

    const [totalNotes, characterCount, chapterCount, detailCount, tagCount, activeInc, resolvedInc, ignoredInc] = await Promise.all([
      prisma.note.count({ where: { bookId } }),
      prisma.note.count({ where: { bookId, type: 'character' } }),
      prisma.note.count({ where: { bookId, type: 'chapter' } }),
      prisma.note.count({ where: { bookId, type: 'detail' } }),
      prisma.tag.count({ where: { notes: { some: { note: { bookId } } } } }),
      prisma.inconsistency.count({ where: { note: { bookId }, status: 'active' } }),
      prisma.inconsistency.count({ where: { note: { bookId }, status: 'resolved' } }),
      prisma.inconsistency.count({ where: { note: { bookId }, status: 'ignored' } }),
    ]);

    return res.json({
      noteCount: totalNotes,
      characterCount,
      chapterCount,
      detailCount,
      tagCount,
      activeInconsistencies: activeInc,
      resolvedInconsistencies: resolvedInc,
      ignoredInconsistencies: ignoredInc,
    });
  } catch {
    return res.status(400).json({ error: 'Invalid book ID' });
  }
});

// PUT /books/:id
router.put('/books/:id', async (req: Request, res: Response) => {
  const parsed = BookUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const bookId = decodeId(req.params.id);
    const book = await prisma.book.update({
      where: { id: bookId },
      data: parsed.data,
    });
    return res.json({ ...book, id: encodeId(book.id) });
  } catch {
    return res.status(404).json({ error: 'Book not found or invalid ID' });
  }
});

// DELETE /books/:id
router.delete('/books/:id', async (req: Request, res: Response) => {
  try {
    const bookId = decodeId(req.params.id);
    await prisma.book.delete({ where: { id: bookId } });
    return res.json({ message: 'Book deleted successfully' });
  } catch {
    return res.status(404).json({ error: 'Book not found or invalid ID' });
  }
});

// POST /books/:id/analyze-interactions
router.post('/books/:id/analyze-interactions', async (req: Request, res: Response) => {
  const { content } = req.body;
  if (!content || typeof content !== 'string' || content.trim().length < 10) {
    return res.status(400).json({ error: 'content is required (min 10 characters)' });
  }
  try {
    const result = await analyzeInteractions(content, prisma);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI service error';
    return res.status(500).json({ error: message });
  }
});

// POST /books/:id/analyze-themes
router.post('/books/:id/analyze-themes', async (req: Request, res: Response) => {
  try {
    const bookId = decodeId(req.params.id);
    const chapters = await prisma.note.findMany({
      where: { bookId, type: 'chapter' },
      select: { title: true, content: true },
      orderBy: { title: 'asc' },
    });
    if (chapters.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 chapter notes to analyze themes' });
    }
    const result = await analyzeThemes(chapters, prisma);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI service error';
    return res.status(500).json({ error: message });
  }
});

// GET /books/:id/pacing
router.get('/books/:id/pacing', async (req: Request, res: Response) => {
  try {
    const bookId = decodeId(req.params.id);
    const chapters = await prisma.note.findMany({
      where: { bookId, type: 'chapter' },
      select: { title: true, content: true },
      orderBy: { title: 'asc' },
    });
    
    // We can still try to analyze if they have at least 1 chapter, but > 2 is better for pacing
    if (chapters.length < 1) {
      return res.status(400).json({ error: 'Need at least 1 chapter note to analyze pacing' });
    }
    
    const result = await analyzePacing(chapters, prisma);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI service error';
    return res.status(500).json({ error: message });
  }
});

// GET /books/:id/loose-ends
router.get('/books/:id/loose-ends', async (req: Request, res: Response) => {
  try {
    const bookId = decodeId(req.params.id);
    const chapters = await prisma.note.findMany({
      where: { bookId, type: 'chapter' },
      select: { title: true, content: true },
      orderBy: { title: 'asc' },
    });
    
    if (chapters.length < 1) {
      return res.status(400).json({ error: 'Need at least 1 chapter note to find loose ends' });
    }
    
    const result = await scanForLooseEnds(chapters, prisma);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI service error';
    return res.status(500).json({ error: message });
  }
});

export default router;
