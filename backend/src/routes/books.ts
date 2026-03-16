import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { encodeId, decodeId } from '../utils/idEncoder.js';
import { 
  analyzeInteractions, 
  analyzeThemes, 
  analyzePacing, 
  scanForLooseEnds,
  analyzeThreads
} from '../services/ai.js';

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

// DELETE /books/:id/history
router.delete('/books/:id/history', async (req: Request, res: Response) => {
  try {
    const bookId = decodeId(req.params.id);
    await prisma.noteVersion.deleteMany({
      where: { note: { bookId } }
    });
    return res.json({ message: 'Book history cleared successfully' });
  } catch {
    return res.status(400).json({ error: 'Failed to clear history' });
  }
});

// DELETE /books/:id/tags
router.delete('/books/:id/tags', async (req: Request, res: Response) => {
  try {
    const bookId = decodeId(req.params.id);
    await prisma.tagsOnNotes.deleteMany({
      where: { note: { bookId } }
    });
    return res.json({ message: 'Book tags cleared successfully' });
  } catch {
    return res.status(400).json({ error: 'Failed to clear tags' });
  }
});

// DELETE /books/:id/ai-associations
router.delete('/books/:id/ai-associations', async (req: Request, res: Response) => {
  try {
    const bookId = decodeId(req.params.id);
    await prisma.$transaction([
      prisma.inconsistency.deleteMany({
        where: { note: { bookId } }
      }),
      prisma.noteLink.deleteMany({
        where: {
          OR: [
            { sourceNote: { bookId } },
            { targetNote: { bookId } }
          ]
        }
      })
    ]);
    return res.json({ message: 'Book AI associations cleared successfully' });
  } catch {
    return res.status(400).json({ error: 'Failed to clear AI associations' });
  }
});

// POST /books/:id/export
router.post('/books/:id/export', async (req: Request, res: Response) => {
  try {
    const bookId = decodeId(req.params.id);
    const { noteOrder } = req.body; // Optional array of note IDs
    
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { 
        notes: { 
          where: { type: 'chapter' }
        } 
      }
    });

    if (!book) return res.status(404).json({ error: 'Book not found' });

    let sortedNotes = book.notes;
    if (noteOrder && Array.isArray(noteOrder)) {
      const orderMap = new Map(noteOrder.map((id, index) => [id, index]));
      sortedNotes = [...book.notes].sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? 999;
        const orderB = orderMap.get(b.id) ?? 999;
        return orderA - orderB;
      });
    } else {
      sortedNotes = [...book.notes].sort((a, b) => a.title.localeCompare(b.title));
    }

    let content = `# ${book.title}\n\n`;
    sortedNotes.forEach(note => {
      content += `## ${note.title}\n\n${note.content}\n\n---\n\n`;
    });

    return res.json({ content });
  } catch {
    return res.status(400).json({ error: 'Export failed' });
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
    const { noteIds } = req.body; // Optional array of note IDs

    const chapters = await prisma.note.findMany({
      where: { 
        bookId, 
        type: 'chapter',
        id: noteIds && Array.isArray(noteIds) ? { in: noteIds } : undefined
      },
      select: { title: true, content: true },
      orderBy: { title: 'asc' },
    });

    if (chapters.length < 1) {
      return res.status(400).json({ error: 'Need at least 1 chapter note to analyze themes' });
    }
    const result = await analyzeThemes(chapters, prisma);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI service error';
    return res.status(500).json({ error: message });
  }
});

// POST /books/:id/pacing
router.post('/books/:id/pacing', async (req: Request, res: Response) => {
  try {
    const bookId = decodeId(req.params.id);
    const { noteIds } = req.body;

    const chapters = await prisma.note.findMany({
      where: { 
        bookId, 
        type: 'chapter',
        id: noteIds && Array.isArray(noteIds) ? { in: noteIds } : undefined
      },
      select: { title: true, content: true },
      orderBy: { title: 'asc' },
    });
    
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

// POST /books/:id/loose-ends
router.post('/books/:id/loose-ends', async (req: Request, res: Response) => {
  try {
    const bookId = decodeId(req.params.id);
    const { noteIds } = req.body;

    const chapters = await prisma.note.findMany({
      where: { 
        bookId, 
        type: 'chapter',
        id: noteIds && Array.isArray(noteIds) ? { in: noteIds } : undefined
      },
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

// POST /books/:id/threads
router.post('/books/:id/threads', async (req: Request, res: Response) => {
  try {
    const bookId = decodeId(req.params.id);
    const { noteIds } = req.body;

    const chapters = await prisma.note.findMany({
      where: { 
        bookId, 
        type: 'chapter',
        id: noteIds && Array.isArray(noteIds) ? { in: noteIds } : undefined
      },
      orderBy: { title: 'asc' }, 
      select: { id: true, title: true, content: true }
    });

    const result = await analyzeThreads(chapters, prisma);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return res.status(500).json({ error: message });
  }
});

export default router;
