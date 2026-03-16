import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Book, Note } from '../types';
import { Modal } from '../components/Modal';
import { WorkflowGuide } from '../components/WorkflowGuide';
import './BookDetailPage.css';

const NOTE_TYPES = ['character', 'chapter', 'detail'] as const;

interface NoteCardProps {
  note: Note;
  onDelete: (noteId: number, e: React.MouseEvent) => void;
  onClick: () => void;
  formatDate: (d: string) => string;
  typeIcon: (type: string) => string;
}

function NoteCard({ note, onDelete, onClick, formatDate, typeIcon }: NoteCardProps) {
  return (
    <div
      className={`note-card glass-card note-card--${note.type}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="note-card-header">
        <span className="note-card-icon">{typeIcon(note.type)}</span>
        <span className={`badge badge-${note.type}`}>{note.type}</span>
        {note.inconsistencies.some(i => i.status === 'active') && (
          <span className="badge badge-active" title="Has active inconsistencies">⚠️</span>
        )}
      </div>
      <h3 className="note-card-title">{note.title}</h3>
      <p className="note-card-excerpt">
        {note.content ? note.content.slice(0, 100) + (note.content.length > 100 ? '…' : '') : 'No content yet.'}
      </p>
      <div className="note-card-footer">
        <div className="note-card-tags">
          {note.tags.slice(0, 3).map(tag => (
            <span key={tag.id} className="badge" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}>
              {tag.name}
            </span>
          ))}
          {note.tags.length > 3 && <span className="text-muted text-xs">+{note.tags.length - 3}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted text-xs">{formatDate(note.updatedAt)}</span>
          <button
            id={`delete-note-${note.id}`}
            className="btn btn-danger btn-sm note-card-delete"
            onClick={e => onDelete(note.id, e)}
            title="Delete note"
          >✕</button>
        </div>
      </div>
    </div>
  );
}

export default function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [isDeletingBook, setIsDeletingBook] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteNoteModal, setShowDeleteNoteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get('folderId');

  useEffect(() => {
    if (!bookId) return;
    Promise.all([
      api.books.get(bookId),
      api.notes.list(bookId),
    ]).then(([b, n]) => {
      setBook(b);
      setNotes(n);
    }).finally(() => setLoading(false));
  }, [bookId]);

  const handleNewNote = async () => {
    if (!bookId) return;
    const typeQuery = filter !== 'all' ? `?type=${filter}` : '';
    navigate(`/books/${bookId}/notes/new${typeQuery}`);
  };

  const handleDeleteBook = async () => {
    if (!bookId || isDeletingBook) return;
    setIsDeletingBook(true);
    try {
      await api.books.delete(bookId);
      navigate('/books');
    } catch (err) {
      console.error('Failed to delete book:', err);
    } finally {
      setIsDeletingBook(false);
    }
  };

  const handleDeleteNote = async (noteId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setNoteToDelete(note);
      setShowDeleteNoteModal(true);
    }
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete || isDeletingNote) return;
    setIsDeletingNote(true);
    try {
      await api.notes.delete(noteToDelete.id);
      window.dispatchEvent(new CustomEvent('refresh-folders'));
      setNotes(prev => prev.filter(n => n.id !== noteToDelete.id));
      setShowDeleteNoteModal(false);
    } catch (err) {
      console.error('Failed to delete note:', err);
    } finally {
      setIsDeletingNote(false);
    }
  };

  let filtered = filter === 'all' ? notes : notes.filter(n => n.type === filter);
  if (folderId) {
    filtered = filtered.filter(n => n.folderId === Number(folderId));
  }

  const typeIcon = (type: string) =>
    ({ character: '🧑', chapter: '📄', detail: '🌍' })[type] ?? '📝';

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="book-detail animate-fade-in">
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          <header className="book-detail-header">
            <div>
              <h1 className="book-detail-title">{book?.title}</h1>
              <p className="book-detail-meta">{notes.length} notes</p>
            </div>
            <div className="flex gap-3">
              <button 
                id="delete-book-btn" 
                className="btn btn-danger btn-lg" 
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Book
              </button>
              <button id="new-note-btn" className="btn btn-primary btn-lg" onClick={handleNewNote}>
                + New Note
              </button>
            </div>
          </header>

          <WorkflowGuide 
            notes={notes} 
            onNavigateToAnalysis={() => navigate(`/books/${bookId}/analysis`)} 
          />

          <div className="flex items-center justify-between mb-6">
            <div className="note-filter-tabs" style={{ marginBottom: 0 }}>
              {['all', ...NOTE_TYPES].map(t => (
                <button
                  key={t}
                  id={`filter-${t}`}
                  className={`filter-tab ${filter === t ? 'active' : ''}`}
                  onClick={() => setFilter(t)}
                >
                  {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <button 
                className={`filter-tab ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
                aria-label="Grid View"
                style={{ padding: 'var(--space-2) var(--space-3)' }}
              >
                ⊞
              </button>
              <button 
                className={`filter-tab ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
                aria-label="List View"
                style={{ padding: 'var(--space-2) var(--space-3)' }}
              >
                ≡
              </button>
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="notes-empty glass-card">
              <p>No {filter === 'all' ? '' : filter} notes yet.</p>
              <button className="btn btn-primary" onClick={handleNewNote}>Create one</button>
            </div>
          )}

          <div className="notes-container animate-fade-in">
            {filter === 'all' ? (
              NOTE_TYPES.map(type => {
                const groupNotes = filtered.filter(n => n.type === type);
                if (groupNotes.length === 0) return null;

                return (
                  <section key={type} className="note-section">
                    <div className="note-section-header">
                      <h2 className="note-section-title">
                        <span className="note-section-icon">{typeIcon(type)}</span>
                        {type.charAt(0).toUpperCase() + type.slice(1)}s
                      </h2>
                      <span className="note-section-count">{groupNotes.length}</span>
                    </div>
                    <div className={viewMode === 'list' ? 'notes-list' : 'notes-grid'}>
                      {groupNotes.map(note => (
                        <NoteCard 
                          key={note.id} 
                          note={note} 
                          onDelete={handleDeleteNote} 
                          onClick={() => navigate(`/books/${bookId}/notes/${note.id}`)}
                          formatDate={formatDate}
                          typeIcon={typeIcon}
                        />
                      ))}
                    </div>
                  </section>
                );
              })
            ) : (
              <div className={viewMode === 'list' ? 'notes-list' : 'notes-grid'}>
                {filtered.map(note => (
                  <NoteCard 
                    key={note.id} 
                    note={note} 
                    onDelete={handleDeleteNote} 
                    onClick={() => navigate(`/books/${bookId}/notes/${note.id}`)}
                    formatDate={formatDate}
                    typeIcon={typeIcon}
                  />
                ))}
              </div>
            )}
          </div>

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
                  {isDeletingBook ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </>
            }
          >
            <div className="flex flex-col gap-4">
              <p>
                Are you sure you want to delete <strong style={{ color: 'var(--color-accent-primary)' }}>{book?.title || 'this book'}</strong>?
              </p>
              <p className="text-sm text-muted">
                This action cannot be undone. All notes, characters, and chapters associated with this book will be permanently removed.
              </p>
            </div>
          </Modal>

          <Modal
            isOpen={showDeleteNoteModal}
            onClose={() => !isDeletingNote && setShowDeleteNoteModal(false)}
            title="Delete Note"
            footer={
              <>
                <button className="btn btn-ghost" onClick={() => setShowDeleteNoteModal(false)}>Cancel</button>
                <button 
                  className="btn btn-danger" 
                  onClick={confirmDeleteNote}
                  disabled={isDeletingNote}
                >
                  {isDeletingNote ? 'Deleting...' : 'Delete Note'}
                </button>
              </>
            }
          >
            <div className="flex flex-col gap-4">
              <p>
                Are you sure you want to delete the note <strong style={{ color: 'var(--color-accent-primary)' }}>{noteToDelete?.title || 'this note'}</strong>?
              </p>
              <p className="text-sm text-muted">
                This action cannot be undone.
              </p>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
