import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { SearchResult } from '../types';
import './SearchPage.css';

const NOTE_TYPES = ['character', 'chapter', 'detail'] as const;

export default function SearchPage() {
  const { bookId } = useParams<{ bookId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryFromUrl = searchParams.get('q') ?? '';
  const typeFromUrl = searchParams.get('type') ?? '';

  const [query, setQuery] = useState(queryFromUrl);
  const [typeFilter, setTypeFilter] = useState(typeFromUrl);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string, type: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.search(q.trim(), bookId, type || undefined);
      setResults(res);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  // Run search whenever URL params change
  useEffect(() => {
    if (queryFromUrl) doSearch(queryFromUrl, typeFromUrl);
  }, [queryFromUrl, typeFromUrl, doSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams();
    if (query.trim()) newParams.set('q', query.trim());
    if (typeFilter) newParams.set('type', typeFilter);
    setSearchParams(newParams);
  };

  const typeIcon = (type: string) =>
    ({ character: '🧑', chapter: '📄', detail: '🌍' })[type] ?? '📝';

  // Group results by book
  const byBook = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const key = r.book.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="search-page animate-fade-in">
      <header className="search-header">
        <h1 className="search-title">🔍 Search Notes</h1>
        <p className="search-subtitle text-muted">
          {bookId ? 'Searching within this book' : 'Searching across your entire library'}
        </p>
      </header>

      {/* Search Form */}
      <form className="search-form glass-card" onSubmit={handleSubmit}>
        <div className="search-input-row">
          <input
            id="global-search-input"
            type="text"
            className="input search-main-input"
            placeholder="Search by title or content…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <button id="search-submit-btn" type="submit" className="btn btn-primary">
            Search
          </button>
          {query && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setQuery('');
                setTypeFilter('');
                setSearchParams({});
                setResults([]);
                setSearched(false);
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="search-filters">
          <span className="text-muted text-sm">Filter by type:</span>
          <div className="note-filter-tabs" style={{ marginBottom: 0 }}>
            {[{ label: 'All', value: '' }, ...NOTE_TYPES.map(t => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))].map(opt => (
              <button
                key={opt.value}
                type="button"
                id={`search-type-${opt.value || 'all'}`}
                className={`filter-tab ${typeFilter === opt.value ? 'active' : ''}`}
                onClick={() => setTypeFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Loading */}
      {loading && (
        <div className="loading-center">
          <div className="spinner" />
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <>
          <div className="search-results-meta">
            <span className="text-muted text-sm">
              {results.length === 0
                ? `No results for "${queryFromUrl}"`
                : `${results.length} result${results.length !== 1 ? 's' : ''} for "${queryFromUrl}"`}
            </span>
          </div>

          {results.length === 0 ? (
            <div className="notes-empty glass-card">
              <p>Nothing found. Try different keywords or remove filters.</p>
            </div>
          ) : (
            Object.entries(byBook).map(([bid, notes]) => (
              <div key={bid} className="search-book-group">
                <h2 className="search-book-heading">
                  📕 {notes[0].book.title}
                </h2>
                <div className="search-results-list">
                  {notes.map(result => (
                    <div
                      key={result.id}
                      className={`search-result-card glass-card note-card--${result.type}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/books/${result.book.id}/notes/${result.id}`)}
                      onKeyDown={e => e.key === 'Enter' && navigate(`/books/${result.book.id}/notes/${result.id}`)}
                    >
                      <div className="search-result-header">
                        <span className="note-card-icon">{typeIcon(result.type)}</span>
                        <span className={`badge badge-${result.type}`}>{result.type}</span>
                        <h3 className="search-result-title">{result.title}</h3>
                      </div>
                      {result.content && (
                        <p className="search-result-excerpt text-muted text-sm">
                          {result.content.slice(0, 150)}{result.content.length > 150 ? '…' : ''}
                        </p>
                      )}
                      {result.tags.length > 0 && (
                        <div className="note-card-tags">
                          {result.tags.slice(0, 4).map(tag => (
                            <span key={tag.id} className="badge" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}>
                              {tag.name}
                            </span>
                          ))}
                          {result.tags.length > 4 && <span className="text-muted text-xs">+{result.tags.length - 4}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {!loading && !searched && (
        <div className="search-empty-state">
          <p className="text-muted">Enter a keyword above to search through your notes.</p>
        </div>
      )}
    </div>
  );
}
