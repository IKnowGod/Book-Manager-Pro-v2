import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get AI Settings
router.get('/ai', async (req, res) => {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['ai_provider', 'ai_api_key', 'ai_base_url', 'ai_model', 'onboarding_completed']
        }
      }
    });
    
    // Convert array of {key, value} to a dictionary
    const config = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    res.json({
      provider: config['ai_provider'] || 'gemini',
      apiKey: config['ai_api_key'] || '', // Maybe obscure this in a real app, but fine for local
      baseUrl: config['ai_base_url'] || '',
      model: config['ai_model'] || '',
      onboardingCompleted: config['onboarding_completed'] === 'true'
    });
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    res.status(500).json({ error: 'Failed to fetch AI settings' });
  }
});

// Update AI Settings
router.post('/ai', async (req, res) => {
  try {
    const { provider, apiKey, baseUrl, model, onboardingCompleted } = req.body;

    const updates = [
      { key: 'ai_provider', value: provider || 'gemini' },
      { key: 'ai_api_key', value: apiKey || '' },
      { key: 'ai_base_url', value: baseUrl || '' },
      { key: 'ai_model', value: model || '' }
    ];

    if (onboardingCompleted !== undefined) {
      updates.push({ key: 'onboarding_completed', value: String(onboardingCompleted) });
    }

    // Upsert all settings
    for (const update of updates) {
      await prisma.setting.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating AI settings:', error);
    res.status(500).json({ error: 'Failed to update AI settings' });
  }
});

export default router;
