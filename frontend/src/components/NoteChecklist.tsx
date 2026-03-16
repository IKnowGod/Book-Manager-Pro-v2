import React from 'react';
import type { Note } from '../types';
import './NoteChecklist.css';

interface Props {
  note: Note;
}

export const NoteChecklist: React.FC<Props> = ({ note }) => {
  const isCharacterOrDetail = note.type === 'character' || note.type === 'detail';
  const isChapter = note.type === 'chapter';

  const items = [];

  if (isCharacterOrDetail) {
    items.push({
      label: 'AI Suggest Tags',
      complete: note.tags.length > 0,
      desc: 'Populate master tag list for character tracking.'
    });
  }

  if (isChapter) {
    items.push({
      label: 'AI Suggest Tags',
      complete: note.tags.length > 0,
      desc: 'Find characters and details in this chapter.'
    });
    items.push({
      label: 'Link Related Notes',
      complete: (note._count?.sourceLinks || 0) + (note._count?.targetLinks || 0) > 0,
      desc: 'Establish links for the Narrative Subway Map.'
    });
    items.push({
      label: 'Run AI Consistency Check',
      complete: note.inconsistencies.length > 0, // Simplified: if they ran it at least once
      desc: 'Verify continuity against world lore.'
    });
  }

  if (items.length === 0) return null;

  return (
    <section className="note-checklist glass-card">
      <h3 className="note-checklist-title">📋 Note Checklist</h3>
      <div className="note-checklist-items">
        {items.map((item, i) => (
          <div key={i} className={`note-checklist-item ${item.complete ? 'complete' : ''}`}>
            <div className="note-checklist-checkbox">
              {item.complete ? '✓' : ''}
            </div>
            <div className="note-checklist-content">
              <span className="note-checklist-label">{item.label}</span>
              <p className="note-checklist-desc">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      {items.every(item => item.complete) && (
        <div className="note-checklist-success animate-fade-in">
          ✨ This note is fully prepared!
        </div>
      )}
    </section>
  );
};
