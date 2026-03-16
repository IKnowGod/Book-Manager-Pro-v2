import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config as serverConfig } from '../config.js';

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

// List Available AI Models
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating AI settings:', error);
    res.status(500).json({ error: 'Failed to update AI settings' });
  }
});

// List Available AI Models
router.get('/ai/models', async (req, res) => {
  try {
    const { provider, apiKey: queryApiKey } = req.query;
    
    // Default to Gemini or get from query
    const targetProvider = (provider as string) || 'gemini';
    
    if (targetProvider !== 'gemini') {
      return res.json([]);
    }

    let apiKey = queryApiKey as string;
    
    if (!apiKey) {
      const dbSettings = await prisma.setting.findMany({
        where: { key: 'ai_api_key' }
      });
      apiKey = dbSettings[0]?.value || serverConfig.geminiApiKey;
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'No API key provided' });
    }

    // Use fetch to call the REST API directly
    // We try both v1 and v1beta to ensure maximum coverage of available models
    let models: any[] = [];
    const endpoints = [
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    ];

    try {
      const results = await Promise.allSettled(endpoints.map(url => fetch(url).then(r => r.json())));
      
      const modelMap = new Map();
      
      results.forEach(result => {
        if (result.status === 'fulfilled' && (result.value as any).models) {
          (result.value as any).models.forEach((m: any) => {
            const name = m.name.replace('models/', '');
            // Only add if it supports content generation and isn't already in the map
            // Priority given to whoever we saw first (likely v1beta)
            if (m.supportedGenerationMethods.includes('generateContent') && !modelMap.has(name)) {
              modelMap.set(name, {
                name,
                displayName: m.displayName || name,
                description: m.description || ''
              });
            }
          });
        }
      });

      models = Array.from(modelMap.values());
      
      // If we still found nothing, use a hardcoded list of modern models
      if (models.length === 0) {
        throw new Error('No models found via API');
      }
    } catch (apiError) {
      console.warn('Dynamic model fetch failed or empty, using fallbacks:', apiError);
      models = [
        { name: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', description: 'Next generation speed and capability' },
        { name: 'gemini-2.0-flash-lite-preview-02-05', displayName: 'Gemini 2.0 Flash-Lite', description: 'Optimized for speed/efficiency' },
        { name: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', description: 'Fast and versatile' },
        { name: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', description: 'High intelligence' },
        { name: 'gemini-2.0-pro-exp-02-05', displayName: 'Gemini 2.0 Pro (Experimental)', description: 'Peak performance' }
      ];
    }

    res.json(models);
  } catch (error: any) {
    console.error('Error fetching AI models:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch AI models' });
  }
});

export default router;
