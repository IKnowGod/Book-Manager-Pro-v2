import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { suggestLinks } from '../services/ai.js';

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
    const sourceId = parseInt(req.params.id);

    // Check if a link already exists in EITHER direction
    const existing = await prisma.noteLink.findFirst({
      where: {
        OR: [
          { sourceId, targetId },
          { sourceId: targetId, targetId: sourceId }
        ]
      }
    });

    let link;
    if (existing) {
      // Update existing link regardless of direction
      link = await prisma.noteLink.update({
        where: { id: existing.id },
        data: { 
          status: 'approved', 
          linkType: linkType ?? existing.linkType, 
          reason: reason ?? existing.reason 
        },
        include: {
          sourceNote: { select: { id: true, title: true, type: true } },
          targetNote: { select: { id: true, title: true, type: true } },
        },
      });
    } else {
      // Create new link
      link = await prisma.noteLink.create({
        data: {
          sourceId,
          targetId,
          linkType: linkType ?? 'related',
          status: 'approved',
          reason: reason ?? '',
        },
        include: {
          sourceNote: { select: { id: true, title: true, type: true } },
          targetNote: { select: { id: true, title: true, type: true } },
        },
      });
    }

    // Normalize: ensure targetNote is always the "other" note for the frontend
    const normalized = {
      ...link,
      targetId: link.sourceId === sourceId ? link.targetId : link.sourceId,
      sourceId: sourceId,
      targetNote: link.sourceId === sourceId ? link.targetNote : link.sourceNote,
    };

    return res.status(existing ? 200 : 201).json(normalized);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create link';
    return res.status(500).json({ error: message });
  }
});

// GET /notes/:id/links — get approved links for a note (bidirectional & deduplicated)
router.get('/notes/:id/links', async (req: Request, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    const links = await prisma.noteLink.findMany({
      where: {
        OR: [
          { sourceId: noteId, status: 'approved' },
          { targetId: noteId, status: 'approved' }
        ]
      },
      include: {
        sourceNote: { select: { id: true, title: true, type: true } },
        targetNote: { select: { id: true, title: true, type: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Deduplicate and normalize: ensure each related note only appears once
    const seenNotes = new Set<number>();
    const deduplicated = [];

    for (const link of links) {
      const otherNoteId = link.sourceId === noteId ? link.targetId : link.sourceId;
      const otherNote = link.sourceId === noteId ? link.targetNote : link.sourceNote;

      if (!seenNotes.has(otherNoteId)) {
        seenNotes.add(otherNoteId);
        deduplicated.push({
          ...link,
          targetId: otherNoteId,
          sourceId: noteId,
          targetNote: otherNote,
        });
      }
    }

    return res.json(deduplicated);
  } catch (err: unknown) {
    console.error('Fetch links error:', err);
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
