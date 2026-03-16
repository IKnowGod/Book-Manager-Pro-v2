import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { decodeId } from '../utils/idEncoder.js';
import { checkConsistency, suggestTags, getBetaReaderFeedback } from '../services/ai.js';

const router = Router();
const prisma = new PrismaClient();

const NoteCreateSchema = z.object({
  type: z.enum(['character', 'chapter', 'detail']),
  title: z.string().min(1).max(200),
  content: z.string().default(''),
  folderId: z.number().nullable().optional(),
});

const NoteUpdateSchema = z.object({
  type: z.enum(['character', 'chapter', 'detail']).optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  folderId: z.number().nullable().optional(),
});

const ConsistencyCheckSchema = z.object({
  new_content: z.string().min(1, 'new_content is required'),
});

async function applyAutoTags(
  noteId: number, 
  type: string, 
  title: string, 
  folderId: number | null, 
  prismaClient: PrismaClient
) {
  const tags: string[] = [type, title];
  
  if (folderId) {
    let currentId: number | null = folderId;
    let safteyCounter = 0;
    
    while (currentId && safteyCounter < 20) {
      const folderData: any = await prismaClient.folder.findUnique({
        where: { id: currentId },
      });
      if (!folderData) break;
      tags.push(folderData.name);
      currentId = folderData.parentId;
      safteyCounter++;
    }
  }

  // Create tags and associate
  for (const tagName of tags) {
    const trimmed = tagName.trim();
    if (!trimmed) continue;

    const dbTag = await prismaClient.tag.upsert({
      where: { name: trimmed },
      create: { name: trimmed },
      update: {},
    });
    
    await prismaClient.tagsOnNotes.upsert({
      where: { noteId_tagId: { noteId, tagId: dbTag.id } },
      create: { noteId, tagId: dbTag.id },
      update: {},
    });
  }
}


// GET /books/:bookId/notes
router.get('/books/:bookId/notes', async (req: Request, res: Response) => {
  try {
    const bookId = decodeId(req.params.bookId);
    const { type, tag_ids } = req.query;

    const where: Record<string, unknown> = { bookId };
    if (type) where.type = type;

    if (tag_ids) {
      const ids = (tag_ids as string).split(',').map(Number);
      where.tags = { some: { tagId: { in: ids } } };
    }

    const notes = await prisma.note.findMany({
      where,
      include: { tags: { include: { tag: true } }, inconsistencies: true },
      orderBy: { updatedAt: 'desc' },
    });

    const shaped = notes.map((n) => ({
      ...n,
      tags: n.tags.map((t) => t.tag),
    }));

    return res.json(shaped);
  } catch {
    return res.status(400).json({ error: 'Invalid book ID' });
  }
});

// POST /books/:bookId/notes
router.post('/books/:bookId/notes', async (req: Request, res: Response) => {
  const parsed = NoteCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const bookId = decodeId(req.params.bookId);
    let note = await prisma.note.create({
      data: { ...parsed.data, bookId },
      include: { tags: { include: { tag: true } }, inconsistencies: true },
    });
    
    await applyAutoTags(note.id, parsed.data.type, parsed.data.title, parsed.data.folderId || null, prisma);
    // refetch to get updated tags
    note = await prisma.note.findUniqueOrThrow({
      where: { id: note.id },
      include: { tags: { include: { tag: true } }, inconsistencies: true },
    });
    
    return res.status(201).json({ ...note, tags: note.tags.map((t) => t.tag) });
  } catch {
    return res.status(400).json({ error: 'Invalid book ID or data' });
  }
});

// GET /notes/:id
router.get('/notes/:id', async (req: Request, res: Response) => {
  try {
    const note = await prisma.note.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { tags: { include: { tag: true } }, inconsistencies: true },
    });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    return res.json({ ...note, tags: note.tags.map((t) => t.tag) });
  } catch {
    return res.status(400).json({ error: 'Invalid note ID' });
  }
});

// PUT /notes/:id
router.put('/notes/:id', async (req: Request, res: Response) => {
  const parsed = NoteUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const noteId = parseInt(req.params.id);
    const oldNote = await prisma.note.findUniqueOrThrow({ where: { id: noteId } });

    // Save version if content has changed
    if (parsed.data.content !== undefined && parsed.data.content !== oldNote.content) {
      await prisma.noteVersion.create({
        data: {
          noteId,
          content: oldNote.content,
        },
      });

      // Maintain only last 15 versions (FIFO)
      const versionCount = await prisma.noteVersion.count({ where: { noteId } });
      if (versionCount > 15) {
        const oldestVersions = await prisma.noteVersion.findMany({
          where: { noteId },
          orderBy: { createdAt: 'asc' },
          take: versionCount - 15,
        });
        const idsToDelete = oldestVersions.map((v) => v.id);
        await prisma.noteVersion.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }
    }

    await prisma.note.update({
      where: { id: noteId },
      data: parsed.data,
    });
    
    // Apply auto-tags based on current (possibly updated) state
    const currentNote = await prisma.note.findUniqueOrThrow({ where: { id: noteId } });
    await applyAutoTags(currentNote.id, currentNote.type, currentNote.title, currentNote.folderId, prisma);

    // Always refetch to get updated tags, folder data, and inconsistencies
    const updatedNote = await prisma.note.findUniqueOrThrow({
      where: { id: noteId },
      include: { tags: { include: { tag: true } }, inconsistencies: true },
    });
    
    return res.json({ ...updatedNote, tags: updatedNote.tags.map((t) => t.tag) });
  } catch {
    return res.status(404).json({ error: 'Note not found' });
  }
});

// GET /notes/:id/versions
router.get('/notes/:id/versions', async (req: Request, res: Response) => {
  try {
    const versions = await prisma.noteVersion.findMany({
      where: { noteId: parseInt(req.params.id) },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });
    return res.json(versions);
  } catch {
    return res.status(400).json({ error: 'Invalid note ID' });
  }
});

// DELETE /notes/:id
router.delete('/notes/:id', async (req: Request, res: Response) => {
  try {
    await prisma.note.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ message: 'Note deleted successfully' });
  } catch {
    return res.status(404).json({ error: 'Note not found' });
  }
});

// POST /notes/:id/tags/:tagId (associate tag)
router.post('/notes/:id/tags/:tagId', async (req: Request, res: Response) => {
  try {
    await prisma.tagsOnNotes.upsert({
      where: { noteId_tagId: { noteId: parseInt(req.params.id), tagId: parseInt(req.params.tagId) } },
      create: { noteId: parseInt(req.params.id), tagId: parseInt(req.params.tagId) },
      update: {},
    });
    return res.json({ message: 'Tag associated with note successfully' });
  } catch {
    return res.status(400).json({ error: 'Could not associate tag' });
  }
});

// DELETE /notes/:id/tags/:tagId (remove tag)
router.delete('/notes/:id/tags/:tagId', async (req: Request, res: Response) => {
  try {
    await prisma.tagsOnNotes.delete({
      where: { noteId_tagId: { noteId: parseInt(req.params.id), tagId: parseInt(req.params.tagId) } },
    });
    return res.json({ message: 'Tag disassociated from note successfully' });
  } catch {
    return res.status(404).json({ error: 'Association not found' });
  }
});

// POST /notes/:id/check-consistency
router.post('/notes/:id/check-consistency', async (req: Request, res: Response) => {
  const parsed = ConsistencyCheckSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const result = await checkConsistency(parseInt(req.params.id), parsed.data.new_content, prisma);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI service error';
    return res.status(500).json({ error: message });
  }
});

// POST /notes/:id/suggest-tags
router.post('/notes/:id/suggest-tags', async (req: Request, res: Response) => {
  try {
    const result = await suggestTags(parseInt(req.params.id), prisma);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI service error';
    return res.status(500).json({ error: message });
  }
});

// POST /notes/:id/beta-read
router.post('/notes/:id/beta-read', async (req: Request, res: Response) => {
  try {
    const note = await prisma.note.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { content: true }
    });
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    if (!note.content || note.content.trim().length < 10) {
      return res.status(400).json({ error: 'Note content is too short to analyze' });
    }

    const result = await getBetaReaderFeedback(note.content, prisma);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI service error';
    return res.status(500).json({ error: message });
  }
});

export default router;
