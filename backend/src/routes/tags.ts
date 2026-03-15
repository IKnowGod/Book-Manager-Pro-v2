import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const TagCreateSchema = z.object({
  name: z.string().min(1).max(80),
});

// GET /tags
router.get('/tags', async (_req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    return res.json(tags);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// POST /tags
router.post('/tags', async (req: Request, res: Response) => {
  const parsed = TagCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const tag = await prisma.tag.upsert({
      where: { name: parsed.data.name },
      update: {},
      create: { name: parsed.data.name },
    });
    return res.status(201).json(tag);
  } catch {
    return res.status(500).json({ error: 'Failed to create tag' });
  }
});

// DELETE /tags/:id
router.delete('/tags/:id', async (req: Request, res: Response) => {
  try {
    await prisma.tag.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ message: 'Tag deleted successfully' });
  } catch {
    return res.status(404).json({ error: 'Tag not found' });
  }
});

export default router;
