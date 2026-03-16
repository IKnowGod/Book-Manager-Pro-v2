import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ThreadAnalysisResult, Book, Note } from '../types';
import ChapterSubwayMap from '../components/ChapterSubwayMap';
import ChapterSelector from '../components/ChapterSelector';
import './ThreadTrackerPage.css';

export default function ThreadTrackerPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [data, setData] = useState<ThreadAnalysisResult | null>(null);
  const [chapters, setChapters] = useState<Note[]>([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'ai' | 'tags'>('ai');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    
    setLoading(true);
    // Initial load: get book, chapters, and initial analysis
    Promise.all([
      api.books.get(bookId),
      api.notes.list(bookId, 'chapter'),
      api.books.getThreads(bookId)
    ])
      .then(([b, c, t]) => {
        setBook(b);
        setChapters(c);
        setData(t);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [bookId]);

  const runAnalysis = async () => {
    if (!bookId) return;
    setLoading(true);
    try {
      const result = await api.books.getThreads(bookId, selectedNoteIds.length > 0 ? selectedNoteIds : undefined);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (chapterTitle: string) => {
    const note = chapters.find(n => n.title === chapterTitle);
    if (note) {
      navigate(`/books/${bookId}/notes/${note.id}`);
    }
  };

  // --- Tag Mapping Calculation ---
  const tagMappingData = useMemo(() => {
    if (mode !== 'tags') return null;

    const filteredChapters = selectedNoteIds.length > 0 
      ? chapters.filter(c => selectedNoteIds.includes(c.id))
      : chapters;

    const tagMap = new Map<string, { threadName: string; nodes: any[] }>();

    filteredChapters.forEach(chapter => {
      chapter.tags.forEach(tag => {
        if (!tagMap.has(tag.name)) {
          tagMap.set(tag.name, { threadName: tag.name, nodes: [] });
        }
        tagMap.get(tag.name)!.nodes.push({
          chapterTitle: chapter.title,
          intensity: 5,
          summary: `Tagged with ${tag.name}`
        });
      });
    });

    return { 
      threads: Array.from(tagMap.values()).sort((a, b) => b.nodes.length - a.nodes.length) 
    };
  }, [mode, chapters, selectedNoteIds]);

  const activeData = mode === 'ai' ? data : tagMappingData;

  return (
    <div className="thread-tracker-page animate-fade-in">
      <header className="thread-tracker-header">
        <button className="btn btn-ghost" onClick={() => navigate(`/books/${bookId}`)}>
          ← Back
        </button>
        <div className="flex-1">
          <h1 className="thread-tracker-title">🧵 Narrative Subway Map</h1>
          <p className="text-muted text-sm">{book?.title}</p>
        </div>
        
        <div className="flex items-center gap-2 mr-4 bg-[hsla(0,0%,100%,0.05)] p-1 rounded-lg">
          <button 
            className={`btn btn-sm ${mode === 'ai' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('ai')}
          >
            ✦ AI Threads
          </button>
          <button 
            id="mode-tags-btn"
            className={`btn btn-sm ${mode === 'tags' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('tags')}
          >
            🏷️ Tag Mapping
          </button>
        </div>

        <button 
          className="btn btn-ghost" 
          onClick={runAnalysis}
          disabled={loading || mode === 'tags'}
          title={mode === 'tags' ? 'AI Refresh disabled in Tag mode' : ''}
        >
          🔄 Refresh AI
        </button>
      </header>

      {loading ? (
        <div className="loading-center">
          <div className="spinner" />
          <p className="mt-4 text-muted">
            AI is mapping {selectedNoteIds.length > 0 ? selectedNoteIds.length : chapters.length} story threads...
          </p>
        </div>
      ) : error ? (
        <div className="error-card glass-card">
          <p className="text-accent-danger">{error}</p>
          <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <div className="thread-tracker-content">
          <ChapterSelector 
            chapters={chapters} 
            selectedIds={selectedNoteIds} 
            onChange={setSelectedNoteIds}
            title="Targeted Thread Mapping"
          />

          <section className="glass-card p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold">
                  {mode === 'ai' ? 'Narrative Threads (AI)' : 'Tag Trajectories (Manual)'}
                </h2>
                <p className="text-muted text-sm max-width-600">
                  {mode === 'ai' 
                    ? 'Visualizing plot threads and character groups as they move through locations.' 
                    : 'Visualizing each tag as a continuous subway line passing through locations.'}
                  Click a station to jump to that chapter.
                </p>
              </div>

              {/* Dedicated Legend */}
              <div className="subway-legend">
                <h3 className="text-xs font-bold uppercase mb-2 text-muted">Map Legend</h3>
                <div className="flex flex-col gap-2">
                  {(activeData?.threads || []).map((thread, i) => (
                    <div key={`legend-${i}`} className="legend-item">
                      <span 
                        className="legend-line" 
                        style={{ backgroundColor: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4'][i % 7] }} 
                      />
                      <span className="legend-text">{thread.threadName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <ChapterSubwayMap 
              data={activeData?.threads || []} 
              onNodeClick={handleNodeClick} 
            />
          </section>

          <footer className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                💡 How to read this map
              </h3>
              <ul className="text-xs text-muted space-y-3">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Horizontal Lines</strong> represent narrative threads or characters.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Stations (Dots)</strong> are chapter locations.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Convergence</strong> means multiple threads are in the SAME LOCATION.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Intensity</strong> is shown by dot size.</span>
                </li>
              </ul>
            </div>
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                🧵 Improving Accuracy
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                The AI identifies threads and locations based on scene context. 
                Ensure your chapter notes have clear titles and content for better mapping. 
                Focusing on **active dialogue** and **setting descriptions** helps the AI differentiate locations.
              </p>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
