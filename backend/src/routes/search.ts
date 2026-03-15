import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { decodeId, encodeId } from '../utils/idEncoder';

const router = Router();
const prisma = new PrismaClient();

// GET /search?q=&bookId=&type=
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, bookId, type } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const where: Record<string, unknown> = {
      OR: [
        { title: { contains: q.trim() } },
        { content: { contains: q.trim() } },
      ],
    };

    if (bookId && typeof bookId === 'string') {
      try {
        where.bookId = decodeId(bookId);
      } catch {
        return res.status(400).json({ error: 'Invalid bookId' });
      }
    }

    if (type && typeof type === 'string') {
      where.type = type;
    }

    const notes = await prisma.note.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        book: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    const shaped = notes.map((n) => ({
      ...n,
      tags: n.tags.map((t) => t.tag),
      book: { ...n.book, id: encodeId(n.book.id) },
    }));

    return res.json(shaped);
  } catch {
    return res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
