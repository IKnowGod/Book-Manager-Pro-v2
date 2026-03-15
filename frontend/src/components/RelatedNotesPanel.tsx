import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { NoteLink, LinkSuggestion } from '../types';
import './RelatedNotesPanel.css';

interface Props {
  noteId: number;
  bookId: string;
}

const typeIcon = (type: string) =>
  ({ character: '🧑', chapter: '📄', detail: '🌍' })[type] ?? '📝';

const linkTypeLabel: Record<string, string> = {
  character_mention: 'Character Mention',
  plot_reference: 'Plot Reference',
  thematic: 'Thematic',
  related: 'Related',
};

export default function RelatedNotesPanel({ noteId, bookId }: Props) {
  const navigate = useNavigate();
  const { bookId: paramBookId } = useParams();
  const resolvedBookId = bookId || paramBookId || '';

  const [links, setLinks] = useState<NoteLink[]>([]);
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.links.list(noteId)
      .then(setLinks)
      .finally(() => setLoadingLinks(false));
  }, [noteId]);

  const handleSuggest = async () => {
    setSuggesting(true);
    setError(null);
    try {
      const result = await api.links.suggest(noteId);
      if (result.length === 0) {
        setError('No related notes found by the AI.');
      }
      // Filter out already linked targets
      const existingTargets = new Set(links.map(l => l.targetId));
      setSuggestions(result.filter(s => !existingTargets.has(s.targetId)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI error');
    } finally {
      setSuggesting(false);
    }
  };

  const handleApprove = async (suggestion: LinkSuggestion) => {
    setApprovingId(suggestion.targetId);
    try {
      const newLink = await api.links.add(noteId, suggestion.targetId, suggestion.linkType, suggestion.reason);
      setLinks(prev => [...prev, newLink]);
      setSuggestions(prev => prev.filter(s => s.targetId !== suggestion.targetId));
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeleteLink = async (linkId: number) => {
    setDeletingId(linkId);
    try {
      await api.links.delete(linkId);
      setLinks(prev => prev.filter(l => l.id !== linkId));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDismissSuggestion = (targetId: number) => {
    setSuggestions(prev => prev.filter(s => s.targetId !== targetId));
  };

  return (
    <div className="related-notes-panel">
      <div className="related-notes-header">
        <h3 className="related-notes-title">🔗 Related Notes</h3>
        <button
          id="suggest-links-btn"
          className="btn btn-sm btn-ghost"
          onClick={handleSuggest}
          disabled={suggesting}
        >
          {suggesting ? <><div className="spinner" /> Analyzing…</> : '✦ AI Suggest'}
        </button>
      </div>

      {error && <p className="ai-error" style={{ fontSize: 'var(--text-xs)' }}>{error}</p>}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="related-suggestions">
          <div className="related-suggestions-label">AI Suggestions — approve or dismiss:</div>
          {suggestions.map(s => (
            <div key={s.targetId} className="related-suggestion-item">
              <div className="related-suggestion-info">
                <span className="related-note-icon">{typeIcon(s.targetType)}</span>
                <div className="related-suggestion-text">
                  <span className="related-note-title">{s.targetTitle}</span>
                  <span className="badge related-link-type">{linkTypeLabel[s.linkType] ?? s.linkType}</span>
                  <p className="related-reason text-xs text-muted">{s.reason}</p>
                </div>
              </div>
              <div className="related-suggestion-actions">
                <button
                  className="btn btn-sm"
                  style={{ color: 'var(--color-accent-success)' }}
                  onClick={() => handleApprove(s)}
                  disabled={approvingId === s.targetId}
                >
                  ✓
                </button>
                <button
                  className="btn btn-sm text-muted"
                  onClick={() => handleDismissSuggestion(s.targetId)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approved links */}
      {loadingLinks && <div className="spinner" style={{ margin: 'var(--space-3) auto' }} />}

      {!loadingLinks && links.length === 0 && suggestions.length === 0 && (
        <p className="text-muted text-xs" style={{ padding: 'var(--space-2) 0' }}>
          No links yet. Click "✦ AI Suggest" to find related notes.
        </p>
      )}

      {links.map(link => (
        <div
          key={link.id}
          className="related-approved-link"
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/books/${resolvedBookId}/notes/${link.targetId}`)}
          onKeyDown={e => e.key === 'Enter' && navigate(`/books/${resolvedBookId}/notes/${link.targetId}`)}
        >
          <span className="related-note-icon">{typeIcon(link.targetNote.type)}</span>
          <div className="related-link-info">
            <span className="related-note-title">{link.targetNote.title}</span>
            <span className="text-xs text-muted">{linkTypeLabel[link.linkType] ?? link.linkType}</span>
          </div>
          <button
            className="related-link-delete btn btn-sm"
            onClick={e => { e.stopPropagation(); handleDeleteLink(link.id); }}
            disabled={deletingId === link.id}
            title="Remove link"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
