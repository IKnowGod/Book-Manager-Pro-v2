import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Book, BookStats } from '../types';
import { Modal } from '../components/Modal';
import './SettingsPage.css';

export default function SettingsPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [stats, setStats] = useState<BookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingBook, setIsDeletingBook] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    Promise.all([api.books.get(bookId), api.books.stats(bookId)])
      .then(([b, s]) => {
        setBook(b);
        setTitleDraft(b.title);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, [bookId]);

  const handleRenameStart = () => {
    setTitleDraft(book?.title ?? '');
    setEditingTitle(true);
  };

  const handleRenameSave = async () => {
    if (!bookId || !titleDraft.trim() || titleDraft === book?.title) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      const updated = await api.books.update(bookId, titleDraft.trim());
      setBook(updated);
    } finally {
      setSavingTitle(false);
      setEditingTitle(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!bookId || isDeletingBook) return;
    setIsDeletingBook(true);
    try {
      await api.books.delete(bookId);
      navigate('/books');
    } finally {
      setIsDeletingBook(false);
    }
  };

  const statCards = stats
    ? [
        { label: 'Total Notes', value: stats.noteCount, icon: '📝', accent: 'primary' },
        { label: 'Characters', value: stats.characterCount, icon: '🧑', accent: 'character' },
        { label: 'Chapters', value: stats.chapterCount, icon: '📄', accent: 'chapter' },
        { label: 'Details', value: stats.detailCount, icon: '🌍', accent: 'detail' },
        { label: 'Tags Used', value: stats.tagCount, icon: '🏷️', accent: 'tag' },
        { label: 'Active Issues', value: stats.activeInconsistencies, icon: '⚠️', accent: 'danger' },
        { label: 'Resolved', value: stats.resolvedInconsistencies, icon: '✓', accent: 'success' },
        { label: 'Ignored', value: stats.ignoredInconsistencies, icon: '—', accent: 'muted' },
      ]
    : [];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="settings-page animate-fade-in">
      {loading ? (
        <div className="loading-center">
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="settings-header">
            <button className="btn btn-ghost" onClick={() => navigate(`/books/${bookId}`)}>
              ← Back to Notes
            </button>
            <h1 className="settings-title">⚙️ Book Settings</h1>
          </header>

          {/* Book Info Card */}
          <section className="settings-card glass-card">
            <h2 className="settings-section-title">Book Information</h2>
            <div className="settings-book-info">
              {editingTitle ? (
                <div className="settings-rename-row">
                  <input
                    id="rename-book-input"
                    className="input settings-rename-input"
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameSave();
                      if (e.key === 'Escape') setEditingTitle(false);
                    }}
                    autoFocus
                  />
                  <button
                    id="rename-save-btn"
                    className="btn btn-primary"
                    onClick={handleRenameSave}
                    disabled={savingTitle || !titleDraft.trim()}
                  >
                    {savingTitle ? <><div className="spinner" /> Saving…</> : 'Save'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setEditingTitle(false)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="settings-title-row">
                  <span className="settings-book-icon">📕</span>
                  <h3 className="settings-book-title">{book?.title}</h3>
                  <button id="rename-book-btn" className="btn btn-ghost btn-sm" onClick={handleRenameStart}>
                    ✏️ Rename
                  </button>
                </div>
              )}
              <div className="settings-dates">
                <span className="text-muted text-sm">Created: {book ? formatDate(book.createdAt) : '—'}</span>
                <span className="text-muted text-sm">Last updated: {book ? formatDate(book.updatedAt) : '—'}</span>
              </div>
            </div>
          </section>

          {/* Statistics */}
          <section className="settings-card glass-card">
            <h2 className="settings-section-title">📊 Book Statistics</h2>
            <div className="settings-stats-grid">
              {statCards.map(card => (
                <div key={card.label} className={`stat-card stat-card--${card.accent}`}>
                  <span className="stat-card-icon">{card.icon}</span>
                  <span className="stat-card-value">{card.value}</span>
                  <span className="stat-card-label">{card.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Danger Zone */}
          <section className="settings-card settings-danger-zone glass-card">
            <h2 className="settings-section-title settings-danger-title">🗑️ Danger Zone</h2>
            <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-4)' }}>
              Permanently delete this book and all its notes. This action cannot be undone.
            </p>
            <button
              id="delete-book-settings-btn"
              className="btn btn-danger"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete This Book
            </button>
          </section>

          <Modal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            title="Delete Book"
            footer={
              <>
                <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteBook}
                  disabled={isDeletingBook}
                >
                  {isDeletingBook ? 'Deleting…' : 'Delete Permanently'}
                </button>
              </>
            }
          >
            <div className="flex flex-col gap-4">
              <p>
                Are you sure you want to delete{' '}
                <strong style={{ color: 'var(--color-accent-primary)' }}>{book?.title}</strong>?
              </p>
              <p className="text-sm text-muted">
                All notes, tags, and AI analysis data for this book will be permanently removed.
              </p>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
