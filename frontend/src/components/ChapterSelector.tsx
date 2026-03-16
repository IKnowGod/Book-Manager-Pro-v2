import { useState } from 'react';
import type { Note } from '../types';
import './ChapterSelector.css';

interface Props {
  chapters: Note[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  title?: string;
}

export default function ChapterSelector({ chapters, selectedIds, onChange, title = "Select Chapters to Analyze" }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => onChange(chapters.map(c => c.id));
  const clearAll = () => onChange([]);

  const isAllSelected = chapters.length > 0 && selectedIds.length === chapters.length;

  return (
    <div className="chapter-selector glass-card">
      <div className="chapter-selector-header" onClick={() => setIsOpen(!isOpen)}>
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {selectedIds.length === 0 
              ? 'All chapters (Default)' 
              : `${selectedIds.length} selected`}
          </span>
          <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {isOpen && (
        <div className="chapter-selector-body animate-slide-down">
          <div className="chapter-selector-actions">
            <button className="btn-text" onClick={selectAll} disabled={isAllSelected}>Select All</button>
            <button className="btn-text" onClick={clearAll} disabled={selectedIds.length === 0}>Clear</button>
          </div>
          <div className="chapter-selector-list">
            {chapters.map(chapter => (
              <label key={chapter.id} className="chapter-selector-item">
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(chapter.id)} 
                  onChange={() => toggleSelect(chapter.id)}
                />
                <span className="chapter-selector-title">{chapter.title}</span>
              </label>
            ))}
          </div>
          {chapters.length === 0 && (
            <p className="text-xs text-center py-4 text-muted">No chapters found in this book.</p>
          )}
        </div>
      )}
    </div>
  );
}
