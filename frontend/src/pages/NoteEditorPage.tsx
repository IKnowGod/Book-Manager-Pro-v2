import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Note, Tag, Inconsistency, TagSuggestionResult, Folder, BetaReaderFeedback } from '../types';
import RelatedNotesPanel from '../components/RelatedNotesPanel';
import VersionHistoryPanel from '../components/VersionHistoryPanel';
import { NoteChecklist } from '../components/NoteChecklist';
import { useToast } from '../context/ToastContext';
import './NoteEditorPage.css';

const NOTE_TYPES = ['character', 'chapter', 'detail'] as const;
type NoteType = typeof NOTE_TYPES[number];

export default function NoteEditorPage() {
  const { bookId, noteId } = useParams<{ bookId: string; noteId?: string }>();
  const isNew = noteId === undefined || noteId === 'new';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const typeParam = searchParams.get('type') as NoteType | null;
  const initialType = typeParam && NOTE_TYPES.includes(typeParam) ? typeParam : 'character';

  const [note, setNote] = useState<Note | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [form, setForm] = useState<{ title: string; type: NoteType; content: string; folderId: number | null }>({ 
    title: '', type: initialType, content: '', folderId: Number(searchParams.get('folderId')) || null 
  });
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestionResult | null>(null);
  const [betaFeedback, setBetaFeedback] = useState<BetaReaderFeedback | null>(null);
  const [inconsistencies, setInconsistencies] = useState<Inconsistency[]>([]);
  const { showToast } = useToast();

  // Inconsistency highlight — populated from URL params when navigating from the Issues page
  const highlightText = searchParams.get('highlight') ?? '';
  const inconsistencyDesc = searchParams.get('inconsistency') ?? '';
  const inconsistencyId = searchParams.get('inconsistencyId');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const showBanner = !bannerDismissed && !!inconsistencyDesc;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.tags.list().then(setAllTags);
    if (bookId) {
      api.folders.list(bookId).then(setFolders);
    }
    if (!isNew && noteId) {
      api.notes.get(parseInt(noteId)).then(n => {
        setNote(n);
        setForm({ title: n.title, type: n.type, content: n.content, folderId: n.folderId || null });
        setInconsistencies(n.inconsistencies);
      });
    }
  }, [noteId, isNew, bookId]);

  // Auto-select the offending text in the textarea when navigating from the Issues page
  useEffect(() => {
    if (!highlightText || !textareaRef.current) return;
    const ta = textareaRef.current;
    const idx = ta.value.toLowerCase().indexOf(highlightText.toLowerCase());
    if (idx !== -1) {
      ta.focus();
      ta.setSelectionRange(idx, idx + highlightText.length);
      // Scroll to selection
      const lineHeight = parseInt(getComputedStyle(ta).lineHeight || '20');
      const lines = ta.value.substring(0, idx).split('\n').length;
      ta.scrollTop = Math.max(0, (lines - 4) * lineHeight);
    }
  // Run after content is loaded into the textarea
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.content, highlightText]);

  // Allow quick-resolve of the inconsistency from the banner
  const handleBannerResolve = async () => {
    if (!inconsistencyId) return;
    await api.inconsistencies.update(parseInt(inconsistencyId), 'resolved');
    setBannerDismissed(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !bookId) return;
    setSaving(true);
    try {
      if (isNew) {
        const created = await api.notes.create(bookId, form);
        window.dispatchEvent(new CustomEvent('refresh-folders'));
        navigate(`/books/${bookId}/notes/${created.id}`, { replace: true });
      } else if (note) {
        const updated = await api.notes.update(note.id, form);
        window.dispatchEvent(new CustomEvent('refresh-folders'));
        setNote(updated);
        setInconsistencies(updated.inconsistencies);
        showToast('Changes saved successfully!');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = async (tagId: number, tagObj?: Tag) => {
    if (!note) return;
    
    // Safety: don't add if already exists in local state
    if (note.tags.some(t => t.id === tagId)) return;

    await api.notes.addTag(note.id, tagId);
    
    const tag = tagObj || allTags.find(t => t.id === tagId);
    if (tag) {
      setNote(prev => prev ? { ...prev, tags: [...prev.tags, tag] } : prev);
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    if (!note) return;
    await api.notes.removeTag(note.id, tagId);
    setNote(prev => prev ? { ...prev, tags: prev.tags.filter(t => t.id !== tagId) } : prev);
  };

  const handleCreateAndAddTag = async (name: string) => {
    if (!note) return;
    const tag = await api.tags.create(name);
    setAllTags(prev => [...prev, tag]);
    await handleAddTag(tag.id, tag);
  };

  const handleCheckConsistency = async () => {
    if (!note || !form.content) return;
    setAiLoading('consistency');
    setAiError(null);
    try {
      const result = await api.notes.checkConsistency(note.id, form.content);
      setInconsistencies(prev => {
        const newItems = result.inconsistencies.map((i, idx) => ({
          id: Date.now() + idx,
          noteId: note.id,
          description: i.description,
          offendingText: i.offending_text,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        return [...prev.filter(p => p.status !== 'active'), ...newItems];
      });
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'AI service error');
    } finally {
      setAiLoading(null);
    }
  };

  const handleSuggestTags = async () => {
    if (!note) return;
    setAiLoading('tags');
    setAiError(null);
    try {
      const result = await api.notes.suggestTags(note.id);
      setTagSuggestions(result);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'AI service error');
    } finally {
      setAiLoading(null);
    }
  };

  const handleBetaRead = async () => {
    if (!note) return;
    setAiLoading('betareader');
    setAiError(null);
    try {
      const result = await api.notes.betaRead(note.id);
      setBetaFeedback(result);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'AI service error');
    } finally {
      setAiLoading(null);
    }
  };

  const updateInconsistencyStatus = async (id: number, status: Inconsistency['status']) => {
    await api.inconsistencies.update(id, status);
    setInconsistencies(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  const handleRestoreVersion = (content: string) => {
    setForm(f => ({ ...f, content }));
  };

  const noteTagIds = new Set(note?.tags.map(t => t.id) ?? []);
  const availableTags = allTags.filter(t => !noteTagIds.has(t.id));
  const activeInconsistencies = inconsistencies.filter(i => i.status === 'active');

  return (
    <div className="note-editor animate-fade-in">
      <header className="note-editor-header">
        <button className="btn btn-ghost" onClick={() => navigate(`/books/${bookId}`)}>
          ← Back
        </button>
        <div className="note-editor-type-tabs">
          {NOTE_TYPES.map(t => (
            <button
              key={t}
              id={`type-${t}`}
              className={`type-tab ${form.type === t ? `active active--${t}` : ''}`}
              onClick={() => setForm(f => ({ ...f, type: t }))}
            >
              {{ character: '🧑', chapter: '📄', detail: '🌍' }[t]} {t}
            </button>
          ))}
        </div>
        <button
          id="save-note-btn"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || !form.title.trim()}
        >
          {saving ? <><div className="spinner" /> Saving…</> : isNew ? 'Create Note' : 'Save Changes'}
        </button>
      </header>

      <div className="note-editor-body">
        {/* Left: Editor */}
        <div className="note-editor-main">
        {/* Inconsistency Highlight Banner */}
          {showBanner && (
            <div className="inconsistency-banner" role="alert">
              <div className="inconsistency-banner-icon">⚠️</div>
              <div className="inconsistency-banner-body">
                <p className="inconsistency-banner-title">Inconsistency to fix:</p>
                <p className="inconsistency-banner-desc">{inconsistencyDesc}</p>
                {highlightText && (
                  <p className="inconsistency-banner-target">
                    Look for: <strong>"{highlightText}"</strong>
                  </p>
                )}
              </div>
              <div className="inconsistency-banner-actions">
                {inconsistencyId && (
                  <button className="btn btn-sm" style={{ color: 'var(--color-accent-success)' }} onClick={handleBannerResolve}>
                    ✓ Resolved
                  </button>
                )}
                <button className="btn btn-sm text-muted" onClick={() => setBannerDismissed(true)}>
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="note-title" className="input-label">
              {form.type === 'character' ? 'Name' : 'Title'}
            </label>
            <input
              id="note-title"
              className="input"
              placeholder={`${form.type === 'character' ? 'Character name…' : form.type === 'chapter' ? 'Chapter title…' : 'Detail name…'}`}
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="note-folder" className="input-label">Folder</label>
            <select
              id="note-folder"
              className="input"
              value={form.folderId || ''}
              onChange={e => setForm(f => ({ ...f, folderId: e.target.value ? Number(e.target.value) : null }))}
            >
              <option value="">No Folder (Root)</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

        <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="note-content" className="input-label">Content</label>
            <textarea
              id="note-content"
              ref={textareaRef}
              className="input note-textarea"
              placeholder="Write your notes here…"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            />
          </div>
        </div>

        {/* Right: AI Panel */}
        <aside className="note-ai-panel">
          {/* Checklist */}
          {note && <NoteChecklist note={note} />}

          {/* Tags */}
          <section className="ai-section glass-card">
            <h3 className="ai-section-title">🏷️ Tags</h3>
            <div className="tag-cloud">
              {(note?.tags ?? []).map(tag => (
                <span key={tag.id} className="tag-chip tag-chip--active">
                  {tag.name}
                  <button className="tag-chip-remove" onClick={() => handleRemoveTag(tag.id)}>×</button>
                </span>
              ))}
              {(note?.tags ?? []).length === 0 && <span className="text-muted text-xs">No tags added</span>}
            </div>

            {availableTags.length > 0 && (
              <select
                id="add-tag-select"
                className="input"
                onChange={e => { if (e.target.value) { handleAddTag(parseInt(e.target.value)); e.target.value = ''; }}}
                defaultValue=""
              >
                <option value="" disabled>Add existing tag…</option>
                {availableTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}

            <div className="flex gap-2 mt-4">
              <input
                id="new-tag-input"
                className="input"
                placeholder="New tag name…"
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    handleCreateAndAddTag(e.currentTarget.value.trim());
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>

            {!isNew && (
              <button
                id="suggest-tags-btn"
                className="btn btn-ghost w-full mt-4"
                onClick={handleSuggestTags}
                disabled={aiLoading === 'tags'}
              >
                {aiLoading === 'tags' ? <><div className="spinner" /> Thinking…</> : '✦ AI Suggest Tags'}
              </button>
            )}

            {tagSuggestions && (
              <div className="ai-suggestions animate-slide-down">
                {tagSuggestions.matched_tags
                  .filter(name => !note?.tags.some(t => t.name.toLowerCase() === name.toLowerCase()))
                  .map(name => {
                  // Case-insensitive search in allTags
                  const existing = allTags.find(t => t.name.toLowerCase() === name.toLowerCase());
                  return (
                    <button
                      key={name}
                      className="tag-chip tag-chip--suggestion"
                      onClick={() => existing && handleAddTag(existing.id, existing)}
                      title={`Add existing tag: ${name}`}
                    >+ {name}</button>
                  );
                })}
                {tagSuggestions.new_suggestions
                  .filter(name => !note?.tags.some(t => t.name.toLowerCase() === name.toLowerCase()))
                  .map(name => (
                  <button
                    key={name}
                    className="tag-chip tag-chip--new"
                    onClick={() => handleCreateAndAddTag(name)}
                    title={`Create new tag: ${name}`}
                  >✦ {name}</button>
                ))}
              </div>
            )}
          </section>

            {/* Consistency */}
          {!isNew && (
            <section className="ai-section glass-card">
              <h3 className="ai-section-title">🔍 Consistency Check</h3>
              <p className="ai-section-desc">Detect contradictions against all existing notes.</p>
              <button
                id="check-consistency-btn"
                className="btn btn-ghost w-full"
                onClick={handleCheckConsistency}
                disabled={aiLoading === 'consistency'}
              >
                {aiLoading === 'consistency' ? <><div className="spinner" /> Analysing…</> : '✦ Run AI Check'}
              </button>

              {aiError && <p className="ai-error">{aiError}</p>}

              {activeInconsistencies.length > 0 && (
                <div className="inconsistency-list">
                  {activeInconsistencies.map(item => (
                    <div key={item.id} className="inconsistency-item">
                      <p className="inconsistency-desc">{item.description}</p>
                      {item.offendingText && (
                        <blockquote className="inconsistency-quote">"{item.offendingText}"</blockquote>
                      )}
                      <div className="inconsistency-actions">
                        <button className="btn btn-sm" style={{ color: 'var(--color-accent-success)' }}
                          onClick={() => updateInconsistencyStatus(item.id, 'resolved')}>✓ Resolved</button>
                        <button className="btn btn-sm text-muted"
                          onClick={() => updateInconsistencyStatus(item.id, 'ignored')}>Ignore</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeInconsistencies.length === 0 && !aiLoading && (
                <p className="ai-clean">No active issues found.</p>
              )}
            </section>
          )}

          {/* Beta Reader */}
          {!isNew && form.type === 'chapter' && (
            <section className="ai-section glass-card">
              <h3 className="ai-section-title">📖 Beta Reader</h3>
              <p className="ai-section-desc">Get simulated reader feedback based on your last save.</p>
              <button
                id="beta-read-btn"
                className="btn btn-ghost w-full"
                onClick={handleBetaRead}
                disabled={aiLoading === 'betareader'}
              >
                {aiLoading === 'betareader' ? <><div className="spinner" /> Reading…</> : '✦ Request Feedback'}
              </button>

              {aiError && aiLoading !== 'betareader' && <p className="ai-error">{aiError}</p>}

              {betaFeedback && (
                <div className="beta-feedback-results mt-4 animate-slide-down p-3 bg-[rgba(255,255,255,0.03)] border border-[var(--color-border)] rounded-lg">
                  <div className="mb-3">
                    <strong className="text-[var(--color-accent-success)] text-sm">✓ Strengths</strong>
                    <ul className="text-sm pl-5 list-disc text-muted mt-1">
                      {betaFeedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="mb-3">
                    <strong className="text-[var(--color-accent-danger)] text-sm">⚠ Weaknesses</strong>
                    <ul className="text-sm pl-5 list-disc text-muted mt-1">
                      {betaFeedback.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                  <div className="mb-3">
                    <strong className="text-[var(--color-accent-primary)] text-sm">❤️ Emotional Impact</strong>
                    <p className="text-sm text-muted mt-1">{betaFeedback.emotional_impact}</p>
                  </div>
                  <div>
                    <strong className="text-[var(--color-accent-warning)] text-sm">⏱️ Pacing</strong>
                    <p className="text-sm text-muted mt-1">{betaFeedback.pacing_notes}</p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Related Notes (Note Linking) */}
          {!isNew && note && bookId && (
            <section className="ai-section glass-card">
              <RelatedNotesPanel noteId={note.id} bookId={bookId} />
            </section>
          )}

          {/* Revision History */}
          {!isNew && note && (
            <section className="ai-section glass-card">
              <VersionHistoryPanel 
                noteId={note.id} 
                currentContent={form.content} 
                onRestore={handleRestoreVersion} 
              />
            </section>
          )}
        </aside>
      </div>

    </div>
  );
}
