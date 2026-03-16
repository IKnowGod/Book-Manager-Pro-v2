import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { NoteVersion } from '../types';
import { diff_match_patch } from 'diff-match-patch';
import './VersionHistoryPanel.css';

interface Props {
  noteId: number;
  currentContent: string;
  onRestore: (content: string) => void;
}

export default function VersionHistoryPanel({ noteId, currentContent, onRestore }: Props) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null);
  const [diffHtml, setDiffHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.notes.getVersions(noteId)
      .then(setVersions)
      .finally(() => setLoading(false));
  }, [noteId]);

  useEffect(() => {
    if (!selectedVersion) {
      setDiffHtml('');
      return;
    }

    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(selectedVersion.content, currentContent);
    dmp.diff_cleanupSemantic(diffs);
    const html = dmp.diff_prettyHtml(diffs);
    setDiffHtml(html);
  }, [selectedVersion, currentContent]);

  return (
    <div className="version-history">
      <h3 className="ai-section-title">🕒 Revision History</h3>
      
      {loading && <div className="spinner-container"><div className="spinner" /></div>}

      {!loading && versions.length === 0 && (
        <p className="text-muted text-xs py-4 text-center">No previous versions found.</p>
      )}

      <div className="version-list">
        {versions.map(v => (
          <button
            key={v.id}
            className={`version-item ${selectedVersion?.id === v.id ? 'active' : ''}`}
            onClick={() => setSelectedVersion(v)}
          >
            <span className="version-date">{new Date(v.createdAt).toLocaleString()}</span>
            <span className="version-preview">{v.content.substring(0, 30)}...</span>
          </button>
        ))}
      </div>

      {selectedVersion && (
        <div className="diff-viewer animate-slide-down">
          <div className="diff-header">
            <span>Changes against selected version:</span>
            <button 
              className="btn btn-sm btn-ghost" 
              onClick={() => onRestore(selectedVersion.content)}
              style={{ color: 'var(--color-accent-primary)' }}
            >
              Restore This
            </button>
          </div>
          <div 
            className="diff-content" 
            dangerouslySetInnerHTML={{ __html: diffHtml }} 
          />
          <button className="btn btn-ghost btn-xs w-full mt-2" onClick={() => setSelectedVersion(null)}>
            Close Comparison
          </button>
        </div>
      )}
    </div>
  );
}
