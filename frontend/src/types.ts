// ============================
// Shared TypeScript Types
// ============================

export interface Folder {
  id: number;
  bookId: number;
  name: string;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
  notes?: Note[];
  children?: Folder[];
  _count?: {
    notes: number;
  };
}
// Shared TypeScript Types
// ============================

export interface Book {
  id: string; // encoded
  title: string;
  noteCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookStats {
  noteCount: number;
  characterCount: number;
  chapterCount: number;
  detailCount: number;
  tagCount: number;
  activeInconsistencies: number;
  resolvedInconsistencies: number;
  ignoredInconsistencies: number;
}

export interface SearchResult extends Note {
  book: { id: string; title: string };
}

export interface Tag {
  id: number;
  name: string;
}

export interface Inconsistency {
  id: number;
  noteId: number;
  chapterNoteId?: number;
  description: string;
  offendingText: string;
  status: 'active' | 'ignored' | 'resolved';
  createdAt: string;
  updatedAt: string;
  note?: { title: string; type: string };
  chapterNote?: { id: number; title: string; type: string };
}

export interface Note {
  id: number;
  bookId: number;
  folderId?: number | null;
  type: 'character' | 'chapter' | 'detail';
  title: string;
  content: string;
  tags: Tag[];
  inconsistencies: Inconsistency[];
  createdAt: string;
  updatedAt: string;
}

export interface ConsistencyCheckResult {
  inconsistencies: { description: string; offending_text: string }[];
}

export interface TagSuggestionResult {
  matched_tags: string[];
  new_suggestions: string[];
}

export interface CharacterInteraction {
  characters: string[];
  summary: string;
}

export interface InteractionAnalysisResult {
  character_interactions: CharacterInteraction[];
  dialogue_count: Record<string, number>;
}

export interface ThemeAnalysisResult {
  themes: Record<string, string[]>;
}

export interface PacingScore {
  chapter: string;
  intensity: number;
}

export interface BetaReaderFeedback {
  strengths: string[];
  weaknesses: string[];
  emotional_impact: string;
  pacing_notes: string;
}

export interface LooseEnd {
  description: string;
  related_chapters: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface NoteLink {
  id: number;
  sourceId: number;
  targetId: number;
  linkType: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  createdAt: string;
  targetNote: { id: number; title: string; type: string };
}

export interface LinkSuggestion {
  targetId: number;
  targetTitle: string;
  targetType: string;
  linkType: string;
  reason: string;
}

export interface AiSettings {
  provider: 'gemini' | 'openai';
  apiKey: string;
  baseUrl: string;
  model: string;
  onboardingCompleted?: boolean;
}

export interface AiModel {
  name: string;
  displayName: string;
  description: string;
}
