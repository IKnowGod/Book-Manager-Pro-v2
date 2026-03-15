import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Inconsistency } from '../types';
import { Modal } from '../components/Modal';
import './InconsistenciesPage.css';

type StatusFilter = 'all' | 'active' | 'ignored' | 'resolved';

export default function InconsistenciesPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<Inconsistency[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    api.inconsistencies
      .list({ book_id: bookId })
      .then(setItems)
      .finally(() => setLoading(false));
  }, [bookId]);

  const handleStatusChange = async (id: number, status: Inconsistency['status']) => {
    setUpdatingId(id);
    try {
      await api.inconsistencies.update(id, status);
      setItems(prev => prev.map(i => (i.id === id ? { ...i, status } : i)));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteClick = (id: number) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete === null || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.inconsistencies.delete(itemToDelete);
      setItems(prev => prev.filter(i => i.id !== itemToDelete));
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Failed to delete inconsistency:', err);
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  // Navigate to the chapter note, passing the offending text + description as URL params
  const handleFixIssue = (item: Inconsistency) => {
    if (!bookId) return;
    const params = new URLSearchParams({
      highlight: item.offendingText,
      inconsistency: item.description,
      inconsistencyId: String(item.id),
    });
    navigate(`/books/${bookId}/notes/${item.noteId}?${params.toString()}`);
  };

  const filtered = statusFilter === 'all' ? items : items.filter(i => i.status === statusFilter);

  const statusCounts = {
    all: items.length,
    active: items.filter(i => i.status === 'active').length,
    ignored: items.filter(i => i.status === 'ignored').length,
    resolved: items.filter(i => i.status === 'resolved').length,
  };

  const noteIcon = (type: string) =>
    ({ character: '🧑', chapter: '📄', detail: '🌍' })[type] ?? '📝';

  return (
    <div className="inconsistencies-page animate-fade-in">
      <header className="inconsistencies-header">
        <button className="btn btn-ghost" onClick={() => navigate(`/books/${bookId}`)}>
          ← Back to Notes
        </button>
        <div className="inconsistencies-heading">
          <h1 className="inconsistencies-title">⚠️ Inconsistencies</h1>
          {items.length > 0 && (
            <span className={`badge ${statusCounts.active > 0 ? 'badge-active' : ''}`}>
              {statusCounts.active} active
            </span>
          )}
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="note-filter-tabs">
        {(['all', 'active', 'ignored', 'resolved'] as StatusFilter[]).map(s => (
          <button
            key={s}
            id={`filter-inc-${s}`}
            className={`filter-tab ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="filter-tab-count">{statusCounts[s]}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="loading-center">
          <div className="spinner" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="notes-empty glass-card">
          <p>
            {statusFilter === 'all'
              ? 'No inconsistencies found. Run an AI consistency check on a note to get started.'
              : `No ${statusFilter} inconsistencies.`}
          </p>
          {statusFilter === 'all' && (
            <button className="btn btn-ghost" onClick={() => navigate(`/books/${bookId}`)}>
              Go to Notes
            </button>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="inconsistency-cards">
          {filtered.map(item => (
            <div
              key={item.id}
              className={`inconsistency-card glass-card inconsistency-card--${item.status}`}
            >
              {/* Card Header: status badge + source note (character/detail) */}
              <div className="inconsistency-card-header">
                <span className={`badge inconsistency-badge--${item.status}`}>
                  {({ active: '⚠️', ignored: '—', resolved: '✓' })[item.status] ?? '?'} {item.status}
                </span>
                {item.note && (
                  <Link
                    to={`/books/${bookId}/notes/${item.noteId}`}
                    className="inconsistency-note-link"
                    title="The note whose facts are being contradicted"
                  >
                    {noteIcon(item.note.type)} {item.note.title}
                  </Link>
                )}
              </div>

              {/* Conflicts-with box */}
              {item.chapterNote ? (
                <div className="inconsistency-chapter-btn" style={{ cursor: 'default' }}>
                  <span className="inconsistency-chapter-label">CONFLICTS WITH:</span>
                  <Link
                    to={`/books/${bookId}/notes/${item.chapterNote.id}`}
                    className="inconsistency-chapter-name"
                    title="View the source of truth"
                    style={{ textDecoration: 'none' }}
                  >
                    {noteIcon(item.chapterNote.type)} {item.chapterNote.title}
                  </Link>
                  <button 
                    className="btn btn-sm" 
                    style={{ margin: 0, padding: '4px 8px', color: 'var(--color-accent-primary)' }}
                    onClick={() => handleFixIssue(item)}
                  >
                    → Fix it
                  </button>
                </div>
              ) : (
                <div className="inconsistency-chapter-btn" style={{ cursor: 'default' }}>
                  <span className="inconsistency-chapter-label">NEEDS FIXING:</span>
                  <span className="inconsistency-chapter-name">
                    {item.note ? `${noteIcon(item.note.type)} ${item.note.title}` : 'Unknown Note'}
                  </span>
                  <button 
                    className="btn btn-sm" 
                    style={{ margin: 0, padding: '4px 8px', color: 'var(--color-accent-primary)' }}
                    onClick={() => handleFixIssue(item)}
                  >
                    → Fix it
                  </button>
                </div>
              )}

              {/* What the inconsistency is */}
              <p className="inconsistency-description">{item.description}</p>

              {/* The exact offending phrase */}
              {item.offendingText && (
                <blockquote className="inconsistency-quote">"{item.offendingText}"</blockquote>
              )}

              {/* Actions */}
              <div className="inconsistency-card-actions">
                {item.status !== 'resolved' && (
                  <button
                    className="btn btn-sm"
                    style={{ color: 'var(--color-accent-success)' }}
                    onClick={() => handleStatusChange(item.id, 'resolved')}
                    disabled={updatingId === item.id}
                  >
                    ✓ Resolve
                  </button>
                )}
                {item.status !== 'active' && (
                  <button
                    className="btn btn-sm"
                    style={{ color: 'var(--color-accent-warning)' }}
                    onClick={() => handleStatusChange(item.id, 'active')}
                    disabled={updatingId === item.id}
                  >
                    ⚠️ Mark Active
                  </button>
                )}
                {item.status !== 'ignored' && (
                  <button
                    className="btn btn-sm text-muted"
                    onClick={() => handleStatusChange(item.id, 'ignored')}
                    disabled={updatingId === item.id}
                  >
                    Hide
                  </button>
                )}
                <button
                  id={`delete-inconsistency-${item.id}`}
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeleteClick(item.id)}
                  disabled={updatingId === item.id}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="Delete Inconsistency"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)}>Cancel</button>
            <button 
              className="btn btn-danger" 
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Removing...' : 'Remove Permanently'}
            </button>
          </>
        }
      >
        <p>Are you sure you want to remove this inconsistency record permanently?</p>
      </Modal>
    </div>
  );
}
