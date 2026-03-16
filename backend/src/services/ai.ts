import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { config } from '../config.js';
import { PrismaClient } from '@prisma/client';

// Generate text helper
export async function generateAIContent(prompt: string, prisma: PrismaClient): Promise<string> {
  const settings = await prisma.setting.findMany({
    where: {
      key: { in: ['ai_provider', 'ai_api_key', 'ai_base_url', 'ai_model'] },
    },
  });

  const configMap = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

  const provider = configMap['ai_provider'] || 'gemini';
  const apiKey = (configMap['ai_api_key'] || config.geminiApiKey).trim();
  const baseUrl = configMap['ai_base_url'] || '';
  const rawModelName = configMap['ai_model'] || (provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-3.5-turbo');

  // Parse potential model chain (comma-separated)
  const modelsToTry = rawModelName.split(',').map(m => m.trim()).filter(Boolean);
  
  if (!apiKey && provider === 'gemini') {
    throw new Error('No API key configured for Gemini. Please set it in Global Settings or .env.local (GEMINI_API_KEY).');
  }

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      if (provider === 'gemini') {
        const genai = new GoogleGenerativeAI(apiKey);
        const model = genai.getGenerativeModel({ model: modelName });
        const response = await model.generateContent(prompt);
        return response.response.text();
      } else {
        const openai = new OpenAI({
          apiKey: apiKey || 'dummy-key',
          baseURL: baseUrl || undefined,
        });
        
        const response = await openai.chat.completions.create({
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        });
        
        return response.choices[0]?.message?.content || '';
      }
    } catch (error: any) {
      lastError = error;
      const status = error.status || (error.response && error.response.status);
      const isRateLimit = status === 429 || error.message?.includes('429') || error.message?.includes('quota');
      
      if (isRateLimit && modelsToTry.indexOf(modelName) < modelsToTry.length - 1) {
        console.warn(`Model ${modelName} exhausted (429/Quota). Falling back to next model: ${modelsToTry[modelsToTry.indexOf(modelName) + 1]}`);
        continue; // Try the next model
      }
      throw error;
    }
  }

  throw lastError || new Error('All models in the chain failed.');
}

interface InconsistencyResult {
  description: string;
  offending_text: string;
  source_note_id?: number;
}

interface ConsistencyCheckResponse {
  inconsistencies: InconsistencyResult[];
}

interface TagSuggestionResponse {
  matched_tags: string[];
  new_suggestions: string[];
}

function cleanJsonResponse(text: string): string {
  return text.trim().replace(/```json/g, '').replace(/```/g, '').trim();
}

export async function checkConsistency(
  noteId: number,
  newContent: string,
  prisma: PrismaClient
): Promise<ConsistencyCheckResponse> {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) throw new Error('Note not found');

  // Fetch ALL character and detail notes from the same book to establish a "Master List" for name verification
  const allReferenceNotes = await prisma.note.findMany({
    where: { 
      bookId: note.bookId, 
      type: { in: ['character', 'detail'] } 
    },
    select: { id: true, title: true, type: true }
  });

  const masterList = allReferenceNotes.map(n => `- ${n.title} (${n.type})`).join('\n');

  // Build a list of context notes (chapters and other notes that mention this note's subject)
  const contextNotes: { id: number; title: string; content: string }[] = [];

  const relatedNotes = await prisma.note.findMany({
    where: { bookId: note.bookId, id: { not: noteId } },
  });

  const titleLower = note.title.trim().toLowerCase();
  const newContentLower = newContent.toLowerCase();

  for (const rNote of relatedNotes) {
    const rTitleLower = rNote.title.trim().toLowerCase();

    // Condition 1: The other note mentions THIS note's title (useful if this is a character/detail)
    const mentionsThis = isNoteMentioned(rNote.content, note.title, note.type);

    // Condition 2: THIS note mentions the other note's title (useful if this is a chapter mentioning characters/details)
    const mentionedByThis = isNoteMentioned(newContent, rNote.title, rNote.type);

    if (mentionsThis || mentionedByThis) {
      contextNotes.push({ id: rNote.id, title: rNote.title, content: rNote.content });
    }
  }

  // Format context with explicit note IDs so the AI can reference them
  const historicalContent = contextNotes.length > 0
    ? contextNotes.map(n =>
        `[NOTE_ID:${n.id}] "${n.title}":\n${n.content}`
      ).join('\n\n---\n\n')
    : `Existing content of note '${note.title}':\n${note.content}`;

  const prompt = `You are a meticulous continuity editor for a novel. Your task is to find contradictions between established facts and new information, AND to catch misspellings of established character or detail names.

MASTER LIST OF ESTABLISHED ENTITIES (Names and Titles):
${masterList}

ESTABLISHED CONTEXT (each note is labeled with its NOTE_ID):
${historicalContent}

NEW INFORMATION being added to the note "${note.title}":
${newContent}

Analyze the new information and identify any contradictions or inconsistencies. 
CRITICAL: Check every name mentioned in the NEW INFORMATION against the MASTER LIST. If a name is misspelled (e.g., "Demitre" instead of "Demitri"), flag it.

For each issue found:
- "description": clearly describe the contradiction or misspelling (e.g., "Potential misspelling: 'Demitre' appears to be 'Demitri Kovalenko' from the master list.")
- "offending_text": the exact phrase or name from the NEW INFORMATION that is incorrect
- "source_note_id": the NOTE_ID integer from the context note that contains the conflicting information. If it's a name misspelling, use the NOTE_ID of the corresponding character note if possible.

Return ONLY a JSON object with a single key "inconsistencies" containing an array. If there are no issues, return an empty array.

Example:
{ "inconsistencies": [
  { "description": "Potential misspelling: 'Demitre' should likely be 'Demitri Kovalenko'.", "offending_text": "Demitre", "source_note_id": 19 }
] }`;

  const rawResponse = await generateAIContent(prompt, prisma);
  
  // Use try/catch or default array to prevent crash on non-json payload
  let parsed: ConsistencyCheckResponse = { inconsistencies: [] };
  try {
    parsed = JSON.parse(cleanJsonResponse(rawResponse));
  } catch (error) {
    console.error('Failed to parse inconsistency JSON:', rawResponse);
  }

  // Build a set of valid context note IDs for validation
  const contextNoteIds = new Set(contextNotes.map(n => n.id));

  // Persist results, now including chapterNoteId
  for (const item of parsed.inconsistencies || []) {
    // Validate source_note_id is a real context note
    const chapterNoteId = item.source_note_id && contextNoteIds.has(item.source_note_id)
      ? item.source_note_id
      : null;

    const existing = await prisma.inconsistency.findFirst({
      where: {
        noteId,
        description: item.description,
        offendingText: item.offending_text,
      },
    });
    if (existing) {
      await prisma.inconsistency.update({
        where: { id: existing.id },
        data: { status: 'active', chapterNoteId },
      });
    } else {
      await prisma.inconsistency.create({
        data: {
          noteId,
          chapterNoteId,
          description: item.description,
          offendingText: item.offending_text,
          status: 'active',
        },
      });
    }
  }

  return parsed;
}

/**
 * Helper to determine if a note's title is mentioned in content.
 * For characters, it checks for partial name matches (e.g. "Savannah" matches "Savannah Parker").
 */
export function isNoteMentioned(content: string, noteTitle: string, noteType: string): boolean {
  const contentLower = content.toLowerCase();
  const titleLower = noteTitle.trim().toLowerCase();
  
  if (!titleLower || titleLower.length < 3) return false;

  // 1. Exact Title Match
  if (contentLower.includes(titleLower)) return true;

  // 2. Character-Specific Partial Matching (First/Last names)
  if (noteType === 'character') {
    const parts = titleLower.split(/\s+/).filter(p => p.length >= 3);
    // Skip common titles from being the SOLE trigger
    const commonTitles = ['commander', 'captain', 'doctor', 'professor', 'agent', 'officer', 'member'];
    
    for (const part of parts) {
      if (commonTitles.includes(part)) continue;
      // Check for word boundary to avoid partial matches like "Dan" in "Danger"
      const regex = new RegExp(`\\b${part}\\b`, 'i');
      if (regex.test(contentLower)) return true;
    }
  }

  return false;
}

export async function suggestTags(
  noteId: number,
  prisma: PrismaClient
): Promise<TagSuggestionResponse> {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) throw new Error('Note not found');

  const allTags = await prisma.tag.findMany();
  const noteWithTags = await prisma.note.findUnique({
    where: { id: noteId },
    include: { tags: { include: { tag: true } } },
  });
  const currentTagNames = new Set(noteWithTags?.tags.map(t => t.tag.name.toLowerCase()) ?? []);
  const existingTagNames = allTags
    .map((t) => t.name)
    .filter(name => !currentTagNames.has(name.toLowerCase()));

  const prompt = `You are an intelligent librarian and archivist. Your task is to analyze a piece of text and suggest tags for it. Here is a master list of all available tags: ${JSON.stringify(existingTagNames)}. Here is the content of a note: '${note.content}'. Please perform two tasks:
  1.  **Match Existing**: Identify which tags from the master list are the most relevant to the note. Do not suggest tags that are not in the master list.
  2.  **Suggest New**: Suggest 1-2 brand new, relevant, and concise tags that are not in the master list and would be a good addition.
  
  CRITICAL: Look for mentioned characters or locations even if only their first or last names are used (e.g., if you see "Savannah", and "Savannah Parker" is in the tag list, match it).
  
  Return your response as a single JSON object with two keys: 'matched_tags' and 'new_suggestions'. Each key should hold an array of strings. For example: { "matched_tags": ["Character Introduction", "Plot Point"], "new_suggestions": ["Secret Alliance"] }`;

  const rawResponse = await generateAIContent(prompt, prisma);
  let parsed: TagSuggestionResponse = { matched_tags: [], new_suggestions: [] };
  try {
    parsed = JSON.parse(cleanJsonResponse(rawResponse));
  } catch (err) {
    console.error('Failed to parse suggestTags JSON', rawResponse);
  }

  // Ensure these exist always
  parsed.matched_tags = parsed.matched_tags || [];
  parsed.new_suggestions = parsed.new_suggestions || [];

  // --- Always include mentioned entities (Chapters/Characters/Details) as tags ---
  // Fetch all other notes from the same book to perform cross-reference scanning.
  const otherNotes = await prisma.note.findMany({
    where: { bookId: note.bookId, id: { not: noteId } },
    select: { id: true, title: true, type: true, content: true },
  });

  const contentLower = note.content.toLowerCase();
  const titleLower = note.title.trim().toLowerCase();

  for (const otherNote of otherNotes) {
    const otherTitle = otherNote.title.trim();
    if (!otherTitle) continue;

    const otherTitleLower = otherTitle.toLowerCase();
    const otherContentLower = otherNote.content.toLowerCase();

    // Condition 1: CURRENT note mentions OTHER note (e.g. Chapter mentions Character)
    const currentMentionsOther = isNoteMentioned(note.content, otherNote.title, otherNote.type);
    
    // Condition 2: OTHER note mentions CURRENT note (e.g. Character mentioned in Chapter)
    // Only do this if one of them is a chapter and the other is a character/detail, or both characters.
    // This prevents tagging every chapter with every other chapter.
    let otherMentionsCurrent = false;
    if (
      (note.type === 'character' && otherNote.type === 'chapter') ||
      (note.type === 'chapter' && otherNote.type === 'character') ||
      (note.type === 'character' && otherNote.type === 'character')
    ) {
      otherMentionsCurrent = isNoteMentioned(otherNote.content, note.title, note.type);
    }

    if (currentMentionsOther || otherMentionsCurrent) {
      const otherTitleLower = otherNote.title.toLowerCase();
      const existingTagMatch = existingTagNames.find(
        (t) => t.toLowerCase() === otherTitleLower
      );

      if (existingTagMatch) {
        // Tag exists in DB, add to matched_tags
        if (!parsed.matched_tags.some(m => m.toLowerCase() === otherTitleLower)) {
          parsed.matched_tags.push(existingTagMatch);
        }
      } else {
        // Tag doesn't exist yet, add to new_suggestions
        if (!parsed.new_suggestions.some(s => s.toLowerCase() === otherTitleLower)) {
          parsed.new_suggestions.push(otherTitle);
        }
      }
    }
  }
  // --------------------------------------------------------

  return parsed;
}

// ======================= Narrative Analysis =======================

export interface CharacterInteraction {
  characters: string[];
  summary: string;
}

export interface InteractionAnalysisResponse {
  character_interactions: CharacterInteraction[];
  dialogue_count: Record<string, number>;
}

export interface ThemeAnalysisResponse {
  themes: Record<string, string[]>; // theme -> array of chapter titles
}

export async function analyzeInteractions(content: string, prisma: PrismaClient): Promise<InteractionAnalysisResponse> {
  const prompt = `Analyze the following text. Identify all characters mentioned and list every meaningful interaction between two or more characters (not just being in the same room). Count the number of dialogue lines spoken by each character.

Return ONLY a JSON object with no markdown fences, using exactly this structure:
{
  "character_interactions": [
    { "characters": ["Character A", "Character B"], "summary": "Brief summary of their interaction" }
  ],
  "dialogue_count": {
    "Character A": 5,
    "Character B": 3
  }
}

If no interactions are found, return empty arrays/objects.

TEXT TO ANALYZE:
${content}`;

  const rawResponse = await generateAIContent(prompt, prisma);
  try {
    return JSON.parse(cleanJsonResponse(rawResponse)) as InteractionAnalysisResponse;
  } catch (e) {
    return { character_interactions: [], dialogue_count: {} };
  }
}

export async function analyzeThemes(
  chapters: { title: string; content: string }[],
  prisma: PrismaClient
): Promise<ThemeAnalysisResponse> {
  const chapterText = chapters
    .map(c => `Chapter: ${c.title}\n${c.content}`)
    .join('\n\n---\n\n');

  const prompt = `Analyze the following chapter summaries/content. Identify the 3-6 primary themes (e.g., "Betrayal", "Redemption", "Loss", "Power"). For each theme, list the chapter titles where it appears.

Return ONLY a JSON object with no markdown fences, using exactly this structure:
{
  "themes": {
    "Betrayal": ["Chapter 1", "Chapter 3"],
    "Redemption": ["Chapter 2"]
  }
}

CHAPTERS:
${chapterText}`;

  const rawResponse = await generateAIContent(prompt, prisma);
  try {
    return JSON.parse(cleanJsonResponse(rawResponse)) as ThemeAnalysisResponse;
  } catch (e) {
    return { themes: {} };
  }
}

// ======================= Pacing Analysis =======================

export interface PacingScore {
  chapter: string;
  intensity: number;
}

export async function analyzePacing(
  chapters: { title: string; content: string }[],
  prisma: PrismaClient
): Promise<PacingScore[]> {
  if (chapters.length === 0) return [];
  
  const chapterText = chapters
    .map(c => `Chapter: ${c.title}\n${c.content}`)
    .join('\n\n---\n\n');

  const prompt = `Analyze the narrative pacing and intensity of the following chapters. For each chapter, calculate an "intensity" score from 1 to 10 based on action density, dialogue-to-narrative ratio, and sentence length variability (faster pacing/higher action = higher score).

Return ONLY a JSON array with no markdown fences, using exactly this structure:
[
  { "chapter": "Chapter 1", "intensity": 4 },
  { "chapter": "Chapter 2", "intensity": 8 }
]

If no chapters are provided, return an empty array [].

CHAPTERS:
${chapterText}`;

  const rawResponse = await generateAIContent(prompt, prisma);
  try {
    return JSON.parse(cleanJsonResponse(rawResponse)) as PacingScore[];
  } catch (e) {
    return [];
  }
}

// ======================= Beta Reader Feedback =======================

export interface BetaReaderFeedback {
  strengths: string[];
  weaknesses: string[];
  emotional_impact: string;
  pacing_notes: string;
}

export async function getBetaReaderFeedback(content: string, prisma: PrismaClient): Promise<BetaReaderFeedback> {
  const prompt = `Act as an honest, constructive beta reader for a novel. Analyze the following chapter or scene. Provide actionable feedback without spoiling any future plot points.

Return ONLY a JSON object with no markdown fences, using exactly this structure:
{
  "strengths": ["Point 1", "Point 2"],
  "weaknesses": ["Point 1", "Point 2"],
  "emotional_impact": "Summary of how this scene feels to a reader.",
  "pacing_notes": "Thoughts on the speed and flow of the scene."
}

TEXT:
${content}`;

  const rawResponse = await generateAIContent(prompt, prisma);
  try {
    return JSON.parse(cleanJsonResponse(rawResponse)) as BetaReaderFeedback;
  } catch (e) {
    return { strengths: [], weaknesses: [], emotional_impact: 'Failed to analyze properly.', pacing_notes: 'Failed to analyze properly.' };
  }
}

// ======================= Loose End Scanner =======================

export interface LooseEnd {
  description: string;
  related_chapters: string[];
  severity: 'low' | 'medium' | 'high';
}

export async function scanForLooseEnds(chapters: { title: string; content: string }[], prisma: PrismaClient): Promise<LooseEnd[]> {
  if (chapters.length === 0) return [];
  
  const chapterText = chapters
    .map(c => `Chapter: ${c.title}\n${c.content}`)
    .join('\n\n---\n\n');

  const prompt = `Act as an expert developmental editor. Analyze the narrative flow across these consecutive chapters to identify "loose ends"—plot threads, character promises, or mysteries that are introduced but appear to be unresolved or forgotten based on the provided text.

Return ONLY a JSON array with no markdown fences, using exactly this structure:
[
  { 
    "description": "The mysterious key Alex found in chapter 1 is never mentioned again.", 
    "related_chapters": ["Chapter 1"],
    "severity": "medium" 
  }
]

If there are no loose ends, return an empty array [].

CHAPTERS:
${chapterText}`;

  const rawResponse = await generateAIContent(prompt, prisma);
  try {
    return JSON.parse(cleanJsonResponse(rawResponse)) as LooseEnd[];
  } catch (e) {
    return [];
  }
}

// ======================= Narrative Subway Map (Threads) =======================

export interface ThreadNode {
  chapterTitle: string;
  intensity: number;
  summary: string;
}

export interface NarrativeThread {
  threadName: string;
  nodes: ThreadNode[];
}

export interface ThreadAnalysisResponse {
  threads: NarrativeThread[];
}

export async function analyzeThreads(
  chapters: { id: number; title: string; content: string }[],
  prisma: PrismaClient
): Promise<ThreadAnalysisResponse> {
  if (chapters.length === 0) return { threads: [] };
  
  const chapterText = chapters
    .map(c => `Chapter: ${c.title}\n${c.content.slice(0, 500)}`) // Substantial slice for context
    .join('\n\n---\n\n');

  const prompt = `Analyze these consecutive chapters. Group them into 3-5 distinct "Narrative Threads" (e.g., "The Rebellion", "The Royal Spies", "Maya's Journey"). 
For each thread, identify which chapters belong to it, identify the primary **location** of the thread in that chapter, provide a 1-sentence scene summary for that thread in that chapter, and assign an "intensity" (1-10) for that thread's prominence in that chapter.

Return ONLY a JSON object using exactly this structure:
{
  "threads": [
    {
      "threadName": "The Rebellion",
      "nodes": [
        { 
          "chapterTitle": "Chapter 1", 
          "intensity": 8, 
          "location": "The Hidden Base",
          "summary": "The rebel cells are introduced." 
        }
      ]
    }
  ]
}

CHAPTERS:
${chapterText}`;

  const rawResponse = await generateAIContent(prompt, prisma);
  try {
    return JSON.parse(cleanJsonResponse(rawResponse)) as ThreadAnalysisResponse;
  } catch (e) {
    return { threads: [] };
  }
}


// ======================= Note Linking =======================

export interface LinkSuggestion {
  targetId: number;
  targetTitle: string;
  targetType: string;
  linkType: string;
  reason: string;
}

export async function suggestLinks(
  noteId: number,
  prisma: PrismaClient
): Promise<LinkSuggestion[]> {
  const sourceNote = await prisma.note.findUnique({ where: { id: noteId } });
  if (!sourceNote) throw new Error('Note not found');

  const otherNotes = await prisma.note.findMany({
    where: { bookId: sourceNote.bookId, id: { not: noteId } },
    select: { id: true, title: true, type: true, content: true },
  });

  if (otherNotes.length === 0) return [];

  const noteList = otherNotes
    .map(n => `ID: ${n.id} | Type: ${n.type} | Title: "${n.title}" | Preview: "${n.content.slice(0, 100)}"`)
    .join('\n');

  const prompt = `You are a literary analyst. Analyze the source note and determine which of the available notes are meaningfully referenced, mentioned, or closely related.

SOURCE NOTE (ID: ${sourceNote.id}, Type: ${sourceNote.type}, Title: "${sourceNote.title}"):
${sourceNote.content.slice(0, 800)}

AVAILABLE NOTES:
${noteList}

Return ONLY a JSON array (no markdown fences) of suggestions. Each item must have:
{ "targetId": <number>, "targetTitle": "<string>", "targetType": "<string>", "linkType": "<character_mention|plot_reference|thematic|related>", "reason": "<one sentence explaining the connection, explicitly using the NAMES and TITLES of the notes involved (e.g., 'Commander Demitri is mentioned briefly in this scene.')>" }

CRITICAL: Identify characters even if only their first or last names are used (e.g., "Savannah" refers to "Savannah Parker").

Only include notes that are genuinely related. Return an empty array [] if none are relevant.`;

  const rawResponse = await generateAIContent(prompt, prisma);
  
  let suggestions: LinkSuggestion[] = [];
  try {
    const raw = cleanJsonResponse(rawResponse);
    suggestions = JSON.parse(raw) as LinkSuggestion[];
  } catch (e) {
    console.error('Failed to parse suggestLinks JSON', rawResponse);
  }

  // --- Map of current suggestions for easy lookup/update ---
  const suggestionMap = new Map<number, LinkSuggestion>();
  suggestions.forEach(s => suggestionMap.set(s.targetId, s));

  // --- Deterministic Pass: Scan for explicit mentions of other notes ---
  const sourceContentLower = sourceNote.content.toLowerCase();

  for (const other of otherNotes) {
    const otherTitle = other.title.trim();
    if (!otherTitle || otherTitle.length < 3) continue; // skip very short names

    const otherTitleLower = otherTitle.toLowerCase();
    
    // Check for explicit mention in content
    if (isNoteMentioned(sourceNote.content, other.title, other.type)) {
      const existing = suggestionMap.get(other.id);
      
      if (existing) {
        // AI already found it, but let's ensure the type is 'character_mention' if it's a character
        if (other.type === 'character') {
          existing.linkType = 'character_mention';
          if (!existing.reason.includes(other.title)) {
            existing.reason = `Direct mention of "${other.title}" found in text.`;
          }
        }
      } else {
        // AI missed it, add deterministic suggestion
        suggestionMap.set(other.id, {
          targetId: other.id,
          targetTitle: other.title,
          targetType: other.type,
          linkType: other.type === 'character' ? 'character_mention' : 'related',
          reason: `Direct mention of "${other.title}" found in text.`
        });
      }
    }
  }

  return Array.from(suggestionMap.values()).filter(s => otherNotes.some(n => n.id === s.targetId));
}
