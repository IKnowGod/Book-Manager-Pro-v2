import { useEffect, useState, useRef } from 'react';
import { NavLink, useNavigate, useMatch, Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { api } from '../api/client';
import type { Book } from '../types';
import FolderTree from './FolderTree';
import { Modal } from './Modal';
import './Sidebar.css';

export default function Sidebar() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewBookModalOpen, setIsNewBookModalOpen] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [creatingBook, setCreatingBook] = useState(false);
  const [newBookError, setNewBookError] = useState<string | null>(null);
  const navigate = useNavigate();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect if we're inside a book route to show per-book nav
  const bookMatch = useMatch('/books/:bookId/*');
  const activeBookId = bookMatch?.params.bookId ?? null;

  useEffect(() => {
    api.books.list()
      .then(setBooks)
      .finally(() => setLoading(false));
  }, []);

  const handleNewBook = async () => {
    if (!newBookTitle.trim()) return;
    setCreatingBook(true);
    try {
      const book = await api.books.create(newBookTitle.trim());
      setBooks(prev => [book, ...prev]);
      setIsNewBookModalOpen(false);
      setNewBookTitle('');
      navigate(`/books/${book.id}`);
    } catch (err) {
      setNewBookError('Failed to create book.');
    } finally {
      setCreatingBook(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim()) {
      const target = activeBookId
        ? `/books/${activeBookId}/search?q=${encodeURIComponent(value.trim())}`
        : `/search?q=${encodeURIComponent(value.trim())}`;
      searchTimer.current = setTimeout(() => navigate(target), 400);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const target = activeBookId
      ? `/books/${activeBookId}/search?q=${encodeURIComponent(searchQuery.trim())}`
      : `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    navigate(target);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-logo" title="Go to Library">
          <img 
            src={logo} 
            alt="Book Manager Pro Logo" 
            className="sidebar-logo-img"
          />
        </Link>
        <span className="sidebar-version">Pro v2</span>
      </div>

      {/* Search */}
      <form className="sidebar-search-form" onSubmit={handleSearchSubmit}>
        <div className="sidebar-search-row">
          <input
            id="sidebar-search-input"
            type="text"
            className="sidebar-search-input"
            placeholder="Search notes…"
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="sidebar-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >×</button>
          )}
        </div>
      </form>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Your Library</div>
        {loading && <div className="sidebar-loading"><div className="spinner" /></div>}
        {!loading && books.length === 0 && (
          <p className="sidebar-empty">No books yet.</p>
        )}
        {books.map(book => {
          const isActive = activeBookId === book.id;
          return (
            <div key={book.id} className="sidebar-item-group">
              <NavLink
                to={`/books/${book.id}`}
                end
                className={() => `sidebar-book-link${isActive ? ' active' : ''}`}
              >
                <span className="sidebar-book-icon">📕</span>
                <span className="sidebar-book-title">{book.title}</span>
                {book.noteCount !== undefined && (
                  <span className="sidebar-book-count">{book.noteCount}</span>
                )}
              </NavLink>

              {/* Per-book sub-navigation & Folders — nested under the active book */}
              {isActive && (
                <div className="sidebar-book-subtree animate-slide-down">
                  <div className="sidebar-book-nav">
                    <NavLink
                      to={`/books/${book.id}/timeline`}
                      className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}
                    >
                      <span>📊</span> Timeline
                    </NavLink>
                    <NavLink
                      to={`/books/${book.id}/analysis`}
                      className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}
                    >
                      <span>🔬</span> Analysis
                    </NavLink>
                    <NavLink
                      to={`/books/${book.id}/inconsistencies`}
                      className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}
                    >
                      <span>⚠️</span> Issues
                    </NavLink>
                    <NavLink
                      to={`/books/${book.id}/settings`}
                      className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}
                    >
                      <span>⚙️</span> Settings
                    </NavLink>
                  </div>
                  
                  <FolderTree bookId={book.id} />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button id="sidebar-new-book-btn" className="btn btn-primary w-full" onClick={() => setIsNewBookModalOpen(true)}>
          + New Book
        </button>
        <NavLink 
          to="/settings" 
          className={({ isActive }) => `btn btn-ghost w-full ${isActive ? 'active' : ''}`} 
          style={{ justifyContent: 'center' }}
        >
          ⚙️ Global Settings
        </NavLink>
      </div>

      <Modal
        isOpen={isNewBookModalOpen}
        onClose={() => {
          if (!creatingBook) {
            setIsNewBookModalOpen(false);
            setNewBookError(null);
          }
        }}
        title="Create New Book"
        footer={
          <div className="flex gap-2 justify-end">
            <button className="btn btn-ghost" onClick={() => setIsNewBookModalOpen(false)} disabled={creatingBook}>
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleNewBook}
              disabled={creatingBook || !newBookTitle.trim()}
            >
              {creatingBook ? 'Creating...' : 'Create Book'}
            </button>
          </div>
        }
      >
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Book Title</label>
          <input
            className="input"
            autoFocus
            value={newBookTitle}
            onChange={e => setNewBookTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && newBookTitle.trim() && handleNewBook()}
            placeholder="e.g. My Great Novel"
          />
        </div>
        {newBookError && <p className="ai-error" style={{ marginTop: 'var(--space-4)' }}>{newBookError}</p>}
      </Modal>
    </aside>
  );
}
