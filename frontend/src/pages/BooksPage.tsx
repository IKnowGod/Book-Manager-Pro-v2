import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Book } from '../types';
import { Modal } from '../components/Modal';
import './BooksPage.css';

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<{ id: string, title: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.books.list()
      .then(res => {
        setBooks(res);
        if (res.length === 0) {
          setIsModalOpen(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = () => {
    setNewBookTitle('');
    setIsModalOpen(true);
  };

  const confirmCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newBookTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const book = await api.books.create(newBookTitle.trim());
      setBooks(prev => [book, ...prev]);
      setIsModalOpen(false);
      navigate(`/books/${book.id}`);
    } catch (err) {
      console.error('Failed to create book:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBookToDelete({ id, title });
  };

  const confirmDelete = async () => {
    if (!bookToDelete || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.books.delete(bookToDelete.id);
      setBooks(prev => prev.filter(b => b.id !== bookToDelete.id));
      setBookToDelete(null);
    } catch (err) {
      console.error('Failed to delete book:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="books-page animate-fade-in">
      <header className="books-header">
        <div>
          <h1 className="books-title">Your Library</h1>
          <p className="books-subtitle">Manage your books, characters, and chapters</p>
        </div>
        <button id="create-book-btn" className="btn btn-primary btn-lg" onClick={handleCreate}>
          + New Book
        </button>
      </header>

      {loading && (
        <div className="books-loading">
          <div className="spinner" />
          <span>Loading library...</span>
        </div>
      )}

      {!loading && books.length === 0 && (
        <div className="books-empty glass-card">
          <div className="books-empty-icon">📖</div>
          <h2>Your library is empty</h2>
          <p>Create your first book to start tracking characters, chapters, and story details.</p>
          <button className="btn btn-primary" onClick={handleCreate}>Create your first book</button>
        </div>
      )}

      {!loading && books.length > 0 && (
        <div className="books-grid">
          {books.map(book => (
            <div
              key={book.id}
              className="book-card glass-card"
              onClick={() => navigate(`/books/${book.id}`)}
              role="button"
              tabIndex={0}
            >
              <div className="book-card-cover">📕</div>
              <div className="book-card-body">
                <h2 className="book-card-title">{book.title}</h2>
                <p className="book-card-meta">
                  <span>{book.noteCount ?? 0} notes</span>
                  <span>·</span>
                  <span>Updated {formatDate(book.updatedAt)}</span>
                </p>
              </div>
              <button
                id={`delete-book-${book.id}`}
                className="btn btn-danger btn-sm book-card-delete"
                onClick={(e) => handleDeleteClick(book.id, book.title, e)}
                title="Delete book"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Book"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button 
              className="btn btn-primary" 
              onClick={() => confirmCreate()}
              disabled={!newBookTitle.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Book'}
            </button>
          </>
        }
      >
        <form onSubmit={confirmCreate} className="form-group">
          <label htmlFor="book-title" className="input-label">Book Title</label>
          <input
            id="book-title"
            type="text"
            className="input"
            placeholder="e.g. My Epic Novel"
            value={newBookTitle}
            onChange={(e) => setNewBookTitle(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-muted mt-4">
            Give your book a memorable title to get started.
          </p>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!bookToDelete}
        onClose={() => setBookToDelete(null)}
        title="Delete Book"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setBookToDelete(null)}>Cancel</button>
            <button 
              className="btn btn-danger" 
              onClick={confirmDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p>
            Are you sure you want to delete <strong style={{ color: 'var(--color-accent-primary)' }}>{bookToDelete?.title}</strong>?
          </p>
          <p className="text-sm text-muted">
            This action cannot be undone. All notes, characters, and chapters associated with this book will be permanently removed.
          </p>
        </div>
      </Modal>
    </div>
  );
}
