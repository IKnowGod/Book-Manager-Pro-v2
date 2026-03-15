import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { suggestLinks } from '../services/ai';

const router = Router();
const prisma = new PrismaClient();

// POST /notes/:id/suggest-links — AI suggestions (does not auto-save)
router.post('/notes/:id/suggest-links', async (req: Request, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    const suggestions = await suggestLinks(noteId, prisma);
    return res.json(suggestions);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI service error';
    return res.status(500).json({ error: message });
  }
});

// POST /notes/:id/links — save an approved link
router.post('/notes/:id/links', async (req: Request, res: Response) => {
  const { targetId, linkType, reason } = req.body;
  if (!targetId || typeof targetId !== 'number') {
    return res.status(400).json({ error: 'targetId (number) is required' });
  }
  try {
    const link = await prisma.noteLink.upsert({
      where: { sourceId_targetId: { sourceId: parseInt(req.params.id), targetId } },
      create: {
        sourceId: parseInt(req.params.id),
        targetId,
        linkType: linkType ?? 'related',
        status: 'approved',
        reason: reason ?? '',
      },
      update: { status: 'approved', linkType: linkType ?? 'related', reason: reason ?? '' },
      include: {
        targetNote: { select: { id: true, title: true, type: true } },
      },
    });
    return res.status(201).json(link);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create link';
    return res.status(500).json({ error: message });
  }
});

// GET /notes/:id/links — get approved links for a note
router.get('/notes/:id/links', async (req: Request, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    const links = await prisma.noteLink.findMany({
      where: { sourceId: noteId, status: 'approved' },
      include: { targetNote: { select: { id: true, title: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(links);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch links' });
  }
});

// DELETE /links/:id — remove a link
router.delete('/links/:id', async (req: Request, res: Response) => {
  try {
    await prisma.noteLink.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ message: 'Link deleted successfully' });
  } catch {
    return res.status(404).json({ error: 'Link not found' });
  }
});

export default router;
