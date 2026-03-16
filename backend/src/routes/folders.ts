import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { decodeId } from '../utils/idEncoder.js';

const router = Router();
const prisma = new PrismaClient();

const FolderCreateSchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.number().nullable().optional(),
});

const FolderUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  parentId: z.number().nullable().optional(),
});

// GET /books/:bookId/folders
router.get('/books/:bookId/folders', async (req: Request, res: Response) => {
  try {
    const bookId = decodeId(req.params.bookId);
    if (!bookId) return res.status(400).json({ error: 'Invalid book ID' });

    const folders = await prisma.folder.findMany({
      where: { bookId },
      include: {
        _count: {
          select: { notes: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    return res.json(folders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// POST /books/:bookId/folders
router.post('/books/:bookId/folders', async (req: Request, res: Response) => {
  const parsed = FolderCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const bookId = decodeId(req.params.bookId);
    if (!bookId) return res.status(400).json({ error: 'Invalid book ID' });

    const folder = await prisma.folder.create({
      data: {
        bookId,
        name: parsed.data.name,
        parentId: parsed.data.parentId || null,
      },
    });

    return res.status(201).json(folder);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create folder' });
  }
});

// PUT /folders/:id
router.put('/folders/:id', async (req: Request, res: Response) => {
  const parsed = FolderUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid folder ID' });

    // Prevent circular reference: ensure parentId is not this folder's own id
    if (parsed.data.parentId === id) {
       return res.status(400).json({ error: 'Folder cannot be its own parent' });
    }

    const folder = await prisma.folder.update({
      where: { id },
      data: {
        name: parsed.data.name,
        parentId: parsed.data.parentId,
      },
    });

    return res.json(folder);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update folder' });
  }
});

// DELETE /folders/:id
router.delete('/folders/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid folder ID' });

    await prisma.folder.delete({
      where: { id },
    });

    return res.json({ message: 'Folder deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete folder' });
  }
});

export default router;
