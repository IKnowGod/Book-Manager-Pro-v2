import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { api } from '../api/client';
import type { Note, InteractionAnalysisResult, ThemeAnalysisResult, PacingScore, LooseEnd } from '../types';
import ChapterSelector from '../components/ChapterSelector';
import { useToast } from '../context/ToastContext';
import './AnalysisPage.css';

type AnalysisTab = 'interactions' | 'themes' | 'pacing' | 'loose-ends';

const COLORS = [
  '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#f43f5e',
  '#3b82f6', '#a855f7', '#14b8a6', '#eab308', '#6366f1',
];

export default function AnalysisPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tab, setTab] = useState<AnalysisTab>('interactions');
  const [selectedNoteIds, setSelectedNoteIds] = useState<number[]>([]);

  // Interactions
  const [chapters, setChapters] = useState<Note[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Note | null>(null);
  const [customContent, setCustomContent] = useState('');
  const [interactionResult, setInteractionResult] = useState<InteractionAnalysisResult | null>(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [interactionError, setInteractionError] = useState<string | null>(null);

  // Themes
  const [themeResult, setThemeResult] = useState<ThemeAnalysisResult | null>(null);
  const [themeLoading, setThemeLoading] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  // Pacing
  const [pacingResult, setPacingResult] = useState<PacingScore[] | null>(null);
  const [pacingLoading, setPacingLoading] = useState(false);
  const [pacingError, setPacingError] = useState<string | null>(null);

  // Loose Ends
  const [looseEndsResult, setLooseEndsResult] = useState<LooseEnd[] | null>(null);
  const [looseEndsLoading, setLooseEndsLoading] = useState(false);
  const [looseEndsError, setLooseEndsError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    api.notes.list(bookId, 'chapter').then(notes => {
      setChapters(notes);
      if (notes.length > 0) {
        setSelectedChapter(notes[0]);
        setCustomContent(notes[0].content);
      }
    });
  }, [bookId]);

  const handleChapterSelect = (id: string) => {
    const ch = chapters.find(c => c.id === parseInt(id));
    if (ch) {
      setSelectedChapter(ch);
      setCustomContent(ch.content);
    }
  };

  const runInteractions = async () => {
    if (!bookId || !customContent.trim()) return;
    setInteractionLoading(true);
    setInteractionError(null);
    try {
      const result = await api.books.analyzeInteractions(bookId, customContent);
      setInteractionResult(result);
      showToast('Interaction analysis complete!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'AI service error', 'error');
    } finally {
      setInteractionLoading(false);
    }
  };

  const runThemes = async () => {
    if (!bookId) return;
    setThemeLoading(true);
    setThemeError(null);
    try {
      const result = await api.books.analyzeThemes(bookId, selectedNoteIds.length > 0 ? selectedNoteIds : undefined);
      setThemeResult(result);
      showToast('Theme analysis complete!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'AI service error', 'error');
    } finally {
      setThemeLoading(false);
    }
  };

  const runPacing = async () => {
    if (!bookId) return;
    setPacingLoading(true);
    setPacingError(null);
    try {
      const result = await api.books.analyzePacing(bookId, selectedNoteIds.length > 0 ? selectedNoteIds : undefined);
      setPacingResult(result);
      showToast('Pacing analysis complete!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'AI service error', 'error');
    } finally {
      setPacingLoading(false);
    }
  };

  const runLooseEnds = async () => {
    if (!bookId) return;
    setLooseEndsLoading(true);
    setLooseEndsError(null);
    try {
      const result = await api.books.analyzeLooseEnds(bookId, selectedNoteIds.length > 0 ? selectedNoteIds : undefined);
      setLooseEndsResult(result);
      showToast('Plot hole scan complete!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'AI service error', 'error');
    } finally {
      setLooseEndsLoading(false);
    }
  };

  // Build dialogue chart data
  const dialogueData = interactionResult
    ? Object.entries(interactionResult.dialogue_count).map(([name, count]) => ({ name, count }))
    : [];

  // Build theme matrix
  const allThemes = themeResult ? Object.keys(themeResult.themes) : [];
  const allThemeChapters = themeResult
    ? [...new Set(Object.values(themeResult.themes).flat())]
    : [];

  return (
    <div className="analysis-page animate-fade-in">
      <header className="analysis-header">
        <button className="btn btn-ghost" onClick={() => navigate(`/books/${bookId}`)}>
          ← Back to Notes
        </button>
        <h1 className="analysis-title">🔬 Narrative Analysis</h1>
      </header>

      {/* Tab switcher */}
      <div className="note-filter-tabs">
        <button
          id="tab-interactions"
          className={`filter-tab ${tab === 'interactions' ? 'active' : ''}`}
          onClick={() => setTab('interactions')}
        >
          🧑 Character Interactions
        </button>
        <button
          id="tab-themes"
          className={`filter-tab ${tab === 'themes' ? 'active' : ''}`}
          onClick={() => setTab('themes')}
        >
          🎭 Thematic Analysis
        </button>
        <button
          id="tab-pacing"
          className={`filter-tab ${tab === 'pacing' ? 'active' : ''}`}
          onClick={() => setTab('pacing')}
        >
          📈 Narrative Pacing
        </button>
        <button
          id="tab-loose-ends"
          className={`filter-tab ${tab === 'loose-ends' ? 'active' : ''}`}
          onClick={() => setTab('loose-ends')}
        >
          🔎 Plot Holes
        </button>
      </div>

      {/* ─── Interactions Tab ─── */}
      {tab === 'interactions' && (
        <div className="analysis-panel">
          <div className="analysis-card glass-card">
            <h2 className="analysis-section-title">🧑 Character Interactions & Dialogue</h2>
            <p className="text-muted text-sm">
              Select a chapter or paste custom text to analyze character interactions and dialogue frequency.
            </p>

            {chapters.length > 0 && (
              <select
                id="chapter-select"
                className="input"
                value={selectedChapter?.id ?? ''}
                onChange={e => handleChapterSelect(e.target.value)}
              >
                {chapters.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            )}

            <textarea
              id="interaction-content"
              className="input analysis-textarea"
              placeholder="Paste chapter text here, or select a chapter above…"
              value={customContent}
              onChange={e => setCustomContent(e.target.value)}
            />

            <button
              id="run-interactions-btn"
              className="btn btn-primary"
              onClick={runInteractions}
              disabled={interactionLoading || !customContent.trim()}
            >
              {interactionLoading ? <><div className="spinner" /> Analyzing…</> : '✦ Analyze Interactions'}
            </button>

            {interactionError && <p className="ai-error">{interactionError}</p>}
          </div>

          {interactionResult && (
            <>
              {/* Dialogue Chart */}
              {dialogueData.length > 0 && (
                <div className="analysis-card glass-card">
                  <h2 className="analysis-section-title">💬 Dialogue Frequency</h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={dialogueData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                        labelStyle={{ color: 'var(--color-text-primary)' }}
                      />
                      <Bar dataKey="count" fill={COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={40} name="Dialogue lines" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Interaction list */}
              {interactionResult.character_interactions.length > 0 && (
                <div className="analysis-card glass-card">
                  <h2 className="analysis-section-title">🤝 Identified Interactions</h2>
                  <div className="interaction-list">
                    {interactionResult.character_interactions.map((item, idx) => (
                      <div key={idx} className="interaction-item">
                        <div className="interaction-chars">
                          {item.characters.map((c, i) => (
                            <span key={i} className={`badge`} style={{ background: `${COLORS[i % COLORS.length]}30`, color: COLORS[i % COLORS.length] }}>{c}</span>
                          ))}
                        </div>
                        <p className="interaction-summary text-sm">{item.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {interactionResult.character_interactions.length === 0 && dialogueData.length === 0 && (
                <div className="notes-empty glass-card">
                  <p>No character interactions or dialogue found in this text.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── Themes Tab ─── */}
      {tab === 'themes' && (
        <div className="analysis-panel">
          <ChapterSelector 
            chapters={chapters} 
            selectedIds={selectedNoteIds} 
            onChange={setSelectedNoteIds}
            title="Selective Theme Analysis"
          />
          <div className="analysis-card glass-card">
            <h2 className="analysis-section-title">🎭 Thematic Presence Analysis</h2>
            <p className="text-muted text-sm">
              AI will analyze all chapter notes in this book and identify recurring themes. Requires at least 2 chapters.
            </p>
            {chapters.length < 2 ? (
              <p className="ai-error">You need at least 2 chapter notes to analyze themes.</p>
            ) : (
              <button
                id="run-themes-btn"
                className="btn btn-primary"
                onClick={runThemes}
                disabled={themeLoading}
              >
                {themeLoading ? <><div className="spinner" /> Analyzing {selectedNoteIds.length > 0 ? selectedNoteIds.length : chapters.length} chapters…</> : '✦ Analyze Themes'}
              </button>
            )}
            {themeError && <p className="ai-error">{themeError}</p>}
          </div>

          {themeResult && allThemes.length > 0 && (
            <div className="analysis-card glass-card">
              <h2 className="analysis-section-title">📊 Theme × Chapter Matrix</h2>
              <div className="theme-table-wrapper">
                <table className="theme-table">
                  <thead>
                    <tr>
                      <th className="theme-table-th theme-col">Theme</th>
                      {allThemeChapters.map(ch => (
                        <th key={ch} className="theme-table-th">{ch.length > 14 ? ch.slice(0, 14) + '…' : ch}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allThemes.map((theme, i) => (
                      <tr key={theme}>
                        <td className="theme-name-cell">
                          <span className="theme-badge" style={{ color: COLORS[i % COLORS.length] }}>{theme}</span>
                        </td>
                        {allThemeChapters.map(ch => {
                          const present = themeResult.themes[theme]?.includes(ch);
                          return (
                            <td key={ch} className={`theme-cell ${present ? 'present' : 'absent'}`}>
                              {present ? '✓' : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Pacing Tab ─── */}
      {tab === 'pacing' && (
        <div className="analysis-panel">
          <ChapterSelector 
            chapters={chapters} 
            selectedIds={selectedNoteIds} 
            onChange={setSelectedNoteIds}
            title="Targeted Pacing Tracker"
          />
          <div className="analysis-card glass-card">
            <h2 className="analysis-section-title">📈 Intensity & Pacing Tracker</h2>
            <p className="text-muted text-sm">
              Visualize the narrative heartbeat. AI analyzes chapter density, dialogue, and action sequences to plot intensity over time.
            </p>
            {chapters.length < 1 ? (
              <p className="ai-error">You need at least 1 chapter note to track pacing.</p>
            ) : (
              <button
                id="run-pacing-btn"
                className="btn btn-primary"
                onClick={runPacing}
                disabled={pacingLoading}
              >
                {pacingLoading ? <><div className="spinner" /> Analyzing {selectedNoteIds.length > 0 ? selectedNoteIds.length : chapters.length} chapters…</> : '✦ Analyze Pacing & Intensity'}
              </button>
            )}
            {pacingError && <p className="ai-error">{pacingError}</p>}
          </div>

          {pacingResult && pacingResult.length > 0 && (
            <div className="analysis-card glass-card">
              <h2 className="analysis-section-title">🌊 Intensity Timeline</h2>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={pacingResult} margin={{ top: 20, right: 20, left: -20, bottom: 40 }}>
                  <defs>
                    <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[3]} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS[3]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="chapter"
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tickCount={6}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                    labelStyle={{ color: 'var(--color-text-primary)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="intensity"
                    stroke={COLORS[3]}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorIntensity)"
                    name="Intensity Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ─── Loose Ends Tab ─── */}
      {tab === 'loose-ends' && (
        <div className="analysis-panel">
          <ChapterSelector 
            chapters={chapters} 
            selectedIds={selectedNoteIds} 
            onChange={setSelectedNoteIds}
            title="Focused Plot Hole Scanner"
          />
          <div className="analysis-card glass-card">
            <h2 className="analysis-section-title">🔎 Plot Hole & Loose End Scanner</h2>
            <p className="text-muted text-sm">
              AI analyzes all chapters to identify unresolved plot threads, forgotten character promises, and abandoned mysteries.
            </p>
            {chapters.length < 1 ? (
              <p className="ai-error">You need at least 1 chapter note to scan for loose ends.</p>
            ) : (
              <button
                id="run-loose-ends-btn"
                className="btn btn-primary mt-4"
                onClick={runLooseEnds}
                disabled={looseEndsLoading}
              >
                {looseEndsLoading ? <><div className="spinner" /> Scanning {selectedNoteIds.length > 0 ? selectedNoteIds.length : chapters.length} chapters…</> : '✦ Scan for Loose Ends'}
              </button>
            )}
            {looseEndsError && <p className="ai-error">{looseEndsError}</p>}
          </div>

          {looseEndsResult !== null && (
            <div className="analysis-card glass-card">
              <h2 className="analysis-section-title">🛑 Identified Threads</h2>
              {looseEndsResult.length === 0 ? (
                <div className="notes-empty p-6 border border-[var(--color-border)] rounded-lg">
                  <span className="text-3xl mb-2 block text-center">🎉</span>
                  <p className="text-center text-[var(--color-accent-success)]">Fantastic! No loose ends or plot holes were detected.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-fade-in">
                  {looseEndsResult.map((le, idx) => (
                    <div key={idx} className="p-4 border border-[var(--color-border)] bg-[var(--color-bg-elevated)] rounded-lg relative overflow-hidden group hover:border-[var(--color-accent-primary)] transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${le.severity === 'high' ? 'bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]' : le.severity === 'medium' ? 'bg-[var(--color-accent-warning)]/20 text-[var(--color-accent-warning)]' : 'bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]'}`}>
                          {le.severity.toUpperCase()} SEVERITY
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-primary)] leading-relaxed mb-3">
                        {le.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-auto">
                        {le.related_chapters.map((rc, i) => (
                          <span key={i} className="text-xs bg-[var(--color-bg-tertiary)] text-muted px-2 py-1 rounded inline-block">
                            {rc}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
