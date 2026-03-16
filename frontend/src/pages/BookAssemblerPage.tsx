import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { api } from '../api/client';
import type { Note, Book } from '../types';
import './BookAssemblerPage.css';

export default function BookAssemblerPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    Promise.all([
      api.books.get(bookId),
      api.notes.list(bookId, 'chapter')
    ]).then(([b, n]) => {
      setBook(b);
      // Sort chapters by title by default initially
      setChapters(n.sort((a, b) => a.title.localeCompare(b.title)));
    }).finally(() => setLoading(false));
  }, [bookId]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(chapters);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setChapters(items);
  };

  const handleExport = async () => {
    if (!bookId) return;
    setExporting(true);
    try {
      const result = await api.books.export(bookId, chapters.map(c => c.id));
      const blob = new Blob([result.content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book?.title || 'manuscript'}.md`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const totalWordCount = chapters.reduce((sum, ch) => sum + (ch.content?.split(/\s+/).filter(Boolean).length || 0), 0);
  const estPages = Math.ceil(totalWordCount / 275);

  return (
    <div className="assembler-page animate-fade-in">
      <header className="assembler-header">
        <button className="btn btn-ghost" onClick={() => navigate(`/books/${bookId}`)}>
          ← Back
        </button>
        <div className="flex-1">
          <h1 className="assembler-title">📚 Book Assembler</h1>
          <p className="text-muted text-sm">{book?.title}</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleExport} 
          disabled={exporting || chapters.length === 0}
        >
          {exporting ? 'Exporting...' : 'Export Manuscript (.md)'}
        </button>
      </header>

      <div className="assembler-layout">
        <div className="assembler-main">
          <section className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">Chapter Sequence</h2>
            <p className="text-muted text-sm mb-6">Drag and drop to reorder chapters for the final manuscript.</p>
            
            {loading ? (
              <div className="py-12 text-center"><div className="spinner" /></div>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="chapters">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="chapter-dropzone">
                      {chapters.map((chapter, index) => (
                        <Draggable key={chapter.id} draggableId={String(chapter.id)} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`chapter-drag-item ${snapshot.isDragging ? 'dragging' : ''}`}
                            >
                              <div className="chapter-handle">⋮⋮</div>
                              <div className="chapter-info">
                                <span className="chapter-index">{index + 1}</span>
                                <span className="chapter-name">{chapter.title}</span>
                              </div>
                              <div className="chapter-meta">
                                {chapter.content?.split(/\s+/).filter(Boolean).length || 0} words
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {chapters.length === 0 && (
                        <div className="text-center py-8 text-muted">No chapters found for this book.</div>
                      )}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </section>
        </div>

        <aside className="assembler-sidebar">
          <section className="glass-card p-4">
            <h3 className="text-sm font-semibold mb-3">📈 Manuscript Stats</h3>
            <div className="assembler-stats">
              <div className="stat-row">
                <span>Total Chapters</span>
                <strong>{chapters.length}</strong>
              </div>
              <div className="stat-row">
                <span>Total Word Count</span>
                <strong>{totalWordCount.toLocaleString()}</strong>
              </div>
              <div className="stat-row">
                <span>Est. Pages (275wpp)</span>
                <strong>{estPages}</strong>
              </div>
            </div>
          </section>

          <section className="glass-card p-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">💡 Tip</h3>
            <p className="text-xs text-muted leading-relaxed">
              The assembler combines all chapter notes into a single Markdown file. 
              Characters and detail notes are not included in the manuscript export but remain 
              available in your workspace.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
