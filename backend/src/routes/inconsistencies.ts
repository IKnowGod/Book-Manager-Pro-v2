import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { decodeId } from '../utils/idEncoder';

const router = Router();
const prisma = new PrismaClient();

const InconsistencyUpdateSchema = z.object({
  status: z.enum(['active', 'ignored', 'resolved']),
});

// GET /inconsistencies
router.get('/inconsistencies', async (req: Request, res: Response) => {
  try {
    const { book_id, note_id, status } = req.query;

    const where: Record<string, unknown> = {};
    if (note_id) where.noteId = parseInt(note_id as string);
    if (status) where.status = status;
    if (book_id) {
      const bookId = decodeId(book_id as string);
      where.note = { bookId };
    }

    const inconsistencies = await prisma.inconsistency.findMany({
      where,
      include: {
        note: { select: { title: true, type: true } },
        chapterNote: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(inconsistencies);
  } catch {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }
});

// GET /inconsistencies/:id
router.get('/inconsistencies/:id', async (req: Request, res: Response) => {
  try {
    const item = await prisma.inconsistency.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        note: { select: { title: true, type: true } },
        chapterNote: { select: { id: true, title: true, type: true } },
      },
    });
    if (!item) return res.status(404).json({ error: 'Inconsistency not found' });
    return res.json(item);
  } catch {
    return res.status(400).json({ error: 'Invalid ID' });
  }
});

// PUT /inconsistencies/:id (update status)
router.put('/inconsistencies/:id', async (req: Request, res: Response) => {
  const parsed = InconsistencyUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const item = await prisma.inconsistency.update({
      where: { id: parseInt(req.params.id) },
      data: { status: parsed.data.status },
    });
    return res.json(item);
  } catch {
    return res.status(404).json({ error: 'Inconsistency not found' });
  }
});

// DELETE /inconsistencies/:id
router.delete('/inconsistencies/:id', async (req: Request, res: Response) => {
  try {
    await prisma.inconsistency.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ message: 'Inconsistency deleted successfully' });
  } catch {
    return res.status(404).json({ error: 'Inconsistency not found' });
  }
});

export default router;
