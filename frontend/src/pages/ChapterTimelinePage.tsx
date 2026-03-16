import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { api } from '../api/client';
import type { Note } from '../types';
import ChapterSelector from '../components/ChapterSelector';
import './ChapterTimelinePage.css';

type ChartTab = 'characters' | 'tags';

// Custom tooltip to keep things clean
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="timeline-tooltip">
      <p className="timeline-tooltip-label">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="timeline-tooltip-row">
          <span className="timeline-tooltip-dot" style={{ background: p.color }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

// Accessible colour palette for bars
const COLORS = [
  '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#f43f5e',
  '#3b82f6', '#a855f7', '#14b8a6', '#eab308', '#6366f1',
];

export default function ChapterTimelinePage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ChartTab>('characters');

  useEffect(() => {
    if (!bookId) return;
    api.notes.list(bookId)
      .then(setAllNotes)
      .finally(() => setLoading(false));
  }, [bookId]);

  const chapters = useMemo(
    () => {
      let filtered = allNotes.filter(n => n.type === 'chapter');
      if (selectedNoteIds.length > 0) {
        filtered = filtered.filter(n => selectedNoteIds.includes(n.id));
      }
      return filtered.sort((a, b) => a.title.localeCompare(b.title));
    },
    [allNotes, selectedNoteIds]
  );

  const allChapters = useMemo(
    () => allNotes.filter(n => n.type === 'chapter').sort((a, b) => a.title.localeCompare(b.title)),
    [allNotes]
  );
  const characters = useMemo(() => allNotes.filter(n => n.type === 'character'), [allNotes]);

  // --- Character presence chart data ---
  // A character is "present" in a chapter if the chapter content mentions their name
  const characterData = useMemo(() => {
    if (!chapters.length || !characters.length) return [];
    return chapters.map(chapter => {
      const row: Record<string, string | number> = {
        chapter: chapter.title,
      };
      characters.forEach(char => {
        // Character is present if name appears in text OR character-name tag is present on chapter
        const textMention = chapter.content.toLowerCase().includes(char.title.toLowerCase());
        const tagMention = chapter.tags.some(t => t.name.toLowerCase() === char.title.toLowerCase());
        row[char.title] = (textMention || tagMention) ? 1 : 0;
      });
      return row;
    });
  }, [chapters, characters]);

  // --- Tag distribution chart data ---
  // For each chapter, count how many tags it shares with each other note type
  const allTagNames = useMemo(() => {
    const names = new Set<string>();
    chapters.forEach(ch => ch.tags.forEach(t => names.add(t.name)));
    return [...names];
  }, [chapters]);

  const tagData = useMemo(() => {
    if (!chapters.length || !allTagNames.length) return [];
    return chapters.map(chapter => {
      const row: Record<string, string | number> = {
        chapter: chapter.title,
      };
      allTagNames.forEach(tagName => {
        row[tagName] = chapter.tags.some(t => t.name === tagName) ? 1 : 0;
      });
      return row;
    });
  }, [chapters, allTagNames]);

  const activeKeys = tab === 'characters' ? characters.map(c => c.title) : allTagNames;
  const activeData = tab === 'characters' ? characterData : tagData;

  const hasData = chapters.length >= 2;

  return (
    <div className="timeline-page animate-fade-in">
      <header className="timeline-header">
        <button className="btn btn-ghost" onClick={() => navigate(`/books/${bookId}`)}>
          ← Back to Notes
        </button>
        <h1 className="timeline-title">📊 Chapter Timeline</h1>
      </header>

      {/* Tab switcher */}
      <div className="note-filter-tabs">
        <button
          id="tab-characters"
          className={`filter-tab ${tab === 'characters' ? 'active' : ''}`}
          onClick={() => setTab('characters')}
        >
          🧑 Character Presence
        </button>
        <button
          id="tab-tags"
          className={`filter-tab ${tab === 'tags' ? 'active' : ''}`}
          onClick={() => setTab('tags')}
        >
          🏷️ Tag Distribution
        </button>
      </div>

      {loading && (
        <div className="loading-center"><div className="spinner" /></div>
      )}

      {!loading && !hasData && (
        <div className="notes-empty glass-card">
          <p>You need at least <strong>2 chapter notes</strong> to see the timeline.</p>
          <button className="btn btn-primary" onClick={() => navigate(`/books/${bookId}/notes/new?type=chapter`)}>
            Create a Chapter Note
          </button>
        </div>
      )}

      {!loading && hasData && activeKeys.length === 0 && (
        <div className="notes-empty glass-card">
          <p>
            {tab === 'characters'
              ? 'No character notes yet. Create character notes and mention them in chapters to see presence data.'
              : 'No tags found on any chapter notes. Add tags to chapters to see tag distribution.'}
          </p>
        </div>
      )}

      {!loading && hasData && activeKeys.length > 0 && (
        <>
          <ChapterSelector 
            chapters={allChapters}
            selectedIds={selectedNoteIds}
            onChange={setSelectedNoteIds}
            title="Filter Timeline by Chapters"
          />

          <div className="timeline-chart-card glass-card">
            <h2 className="timeline-chart-title">
              {tab === 'characters'
                ? `Character Mentions Across ${chapters.length} Chapters`
                : `Tag Usage Across ${chapters.length} Chapters`}
            </h2>
            <p className="timeline-chart-desc text-muted text-sm">
              {tab === 'characters'
                ? 'A character is counted when their name appears in the chapter content.'
                : 'Tags are counted when a tag is directly applied to the chapter note.'}
            </p>

            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={activeData} margin={{ top: 10, right: 20, left: 0, bottom: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="chapter"
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  tickCount={2}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 20, fontSize: 12, color: 'var(--color-text-secondary)' }}
                />
                {activeKeys.map((key, i) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={COLORS[i % COLORS.length]}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={30}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary table */}
          <div className="timeline-table-card glass-card">
            <h2 className="timeline-chart-title">Summary Table</h2>
            <div className="timeline-table-wrapper">
              <table className="timeline-table">
                <thead>
                  <tr>
                    <th>Chapter</th>
                    {activeKeys.map(k => (
                      <th key={k}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeData.map((row) => (
                    <tr key={String(row.chapter)}>
                      <td className="timeline-table-chapter">{String(row.chapter)}</td>
                      {activeKeys.map(k => (
                        <td key={k} className={`timeline-table-cell ${row[k] ? 'present' : 'absent'}`}>
                          {row[k] ? '✓' : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
