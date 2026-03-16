import type { Book, BookStats, Note, Tag, Folder, Inconsistency, ConsistencyCheckResult, TagSuggestionResult, SearchResult, InteractionAnalysisResult, ThemeAnalysisResult, PacingScore, NoteLink, LinkSuggestion, AiSettings } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ---------- Books ----------
export const api = {
  books: {
    list: () => request<Book[]>('/books'),
    get: (id: string) => request<Book>(`/books/${id}`),
    create: (title: string) => request<Book>('/books', { method: 'POST', body: JSON.stringify({ title }) }),
    update: (id: string, title: string) => request<Book>(`/books/${id}`, { method: 'PUT', body: JSON.stringify({ title }) }),
    delete: (id: string) => request<{ message: string }>(`/books/${id}`, { method: 'DELETE' }),
    deleteHistory: (id: string) => request<{ message: string }>(`/books/${id}/history`, { method: 'DELETE' }),
    stats: (id: string) => request<BookStats>(`/books/${id}/stats`),
    analyzeInteractions: (id: string, content: string) =>
      request<InteractionAnalysisResult>(`/books/${id}/analyze-interactions`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    analyzeThemes: (id: string, noteIds?: number[]) =>
      request<ThemeAnalysisResult>(`/books/${id}/analyze-themes`, { 
        method: 'POST',
        body: JSON.stringify({ noteIds })
      }),
    analyzePacing: (id: string, noteIds?: number[]) =>
      request<PacingScore[]>(`/books/${id}/pacing`, {
        method: 'POST',
        body: JSON.stringify({ noteIds })
      }),
    analyzeLooseEnds: (id: string, noteIds?: number[]) =>
      request<import('../types').LooseEnd[]>(`/books/${id}/loose-ends`, {
        method: 'POST',
        body: JSON.stringify({ noteIds })
      }),
    export: (id: string, noteOrder?: number[]) =>
      request<{ content: string }>(`/books/${id}/export`, { 
        method: 'POST',
        body: JSON.stringify({ noteOrder })
      }),
    getThreads: (id: string, noteIds?: number[]) =>
      request<import('../types').ThreadAnalysisResult>(`/books/${id}/threads`, {
        method: 'POST',
        body: JSON.stringify({ noteIds })
      }),
  },

  folders: {
    list: (bookId: string) => request<Folder[]>(`/books/${bookId}/folders`),
    create: (bookId: string, name: string, parentId?: number | null) => 
      request<Folder>(`/books/${bookId}/folders`, { method: 'POST', body: JSON.stringify({ name, parentId }) }),
    update: (id: number, name: string, parentId?: number | null) => 
      request<Folder>(`/folders/${id}`, { method: 'PUT', body: JSON.stringify({ name, parentId }) }),
    delete: (id: number) => request<{ message: string }>(`/folders/${id}`, { method: 'DELETE' }),
  },

  notes: {
    list: (bookId: string, type?: string) =>
      request<Note[]>(`/books/${bookId}/notes${type ? `?type=${type}` : ''}`),
    get: (id: number) => request<Note>(`/notes/${id}`),
    create: (bookId: string, data: Pick<Note, 'type' | 'title' | 'content'> & { folderId?: number | null }) =>
      request<Note>(`/books/${bookId}/notes`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Pick<Note, 'type' | 'title' | 'content'> & { folderId?: number | null }>) =>
      request<Note>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<{ message: string }>(`/notes/${id}`, { method: 'DELETE' }),
    addTag: (id: number, tagId: number) =>
      request<{ message: string }>(`/notes/${id}/tags/${tagId}`, { method: 'POST' }),
    removeTag: (id: number, tagId: number) =>
      request<{ message: string }>(`/notes/${id}/tags/${tagId}`, { method: 'DELETE' }),
    checkConsistency: (id: number, newContent: string) =>
      request<ConsistencyCheckResult>(`/notes/${id}/check-consistency`, {
        method: 'POST',
        body: JSON.stringify({ new_content: newContent }),
      }),
    suggestTags: (id: number) =>
      request<TagSuggestionResult>(`/notes/${id}/suggest-tags`, { method: 'POST' }),
    betaRead: (id: number) =>
      request<import('../types').BetaReaderFeedback>(`/notes/${id}/beta-read`, { method: 'POST' }),
    getVersions: (id: number) =>
      request<import('../types').NoteVersion[]>(`/notes/${id}/versions`),
  },

  tags: {
    list: () => request<Tag[]>('/tags'),
    create: (name: string) => request<Tag>('/tags', { method: 'POST', body: JSON.stringify({ name }) }),
    delete: (id: number) => request<{ message: string }>(`/tags/${id}`, { method: 'DELETE' }),
  },

  inconsistencies: {
    list: (params?: { book_id?: string; note_id?: number; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.book_id) qs.set('book_id', params.book_id);
      if (params?.note_id) qs.set('note_id', String(params.note_id));
      if (params?.status) qs.set('status', params.status);
      return request<Inconsistency[]>(`/inconsistencies?${qs.toString()}`);
    },
    update: (id: number, status: Inconsistency['status']) =>
      request<Inconsistency>(`/inconsistencies/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
    delete: (id: number) =>
      request<{ message: string }>(`/inconsistencies/${id}`, { method: 'DELETE' }),
  },

  links: {
    suggest: (noteId: number) =>
      request<LinkSuggestion[]>(`/notes/${noteId}/suggest-links`, { method: 'POST' }),
    add: (noteId: number, targetId: number, linkType: string, reason: string) =>
      request<NoteLink>(`/notes/${noteId}/links`, {
        method: 'POST',
        body: JSON.stringify({ targetId, linkType, reason }),
      }),
    list: (noteId: number) =>
      request<NoteLink[]>(`/notes/${noteId}/links`),
    delete: (linkId: number) =>
      request<{ message: string }>(`/links/${linkId}`, { method: 'DELETE' }),
  },

  search: (q: string, bookId?: string, type?: string) => {
    const qs = new URLSearchParams({ q });
    if (bookId) qs.set('bookId', bookId);
    if (type) qs.set('type', type);
    return request<SearchResult[]>(`/search?${qs.toString()}`);
  },

  settings: {
    getAi: () => request<AiSettings>('/settings/ai'),
    updateAi: (data: AiSettings) => request<{ success: true }>('/settings/ai', { method: 'POST', body: JSON.stringify(data) }),
    getAiModels: (provider?: string, apiKey?: string) => {
      const qs = new URLSearchParams();
      if (provider) qs.set('provider', provider);
      if (apiKey) qs.set('apiKey', apiKey);
      return request<{ name: string; displayName: string; description: string }[]>(`/settings/ai/models?${qs.toString()}`);
    }
  }
};

