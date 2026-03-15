import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Folder } from '../types';
import { Modal } from './Modal';
import './FolderTree.css';

export default function FolderTree({ bookId }: { bookId: string }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeFolderId = Number(searchParams.get('folderId')) || null;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'rename' | 'delete'>('create');
  const [modalInput, setModalInput] = useState('');
  const [modalTargetId, setModalTargetId] = useState<number | null>(null);
  const [modalParentId, setModalParentId] = useState<number | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchFolders = () => {
    setLoading(true);
    api.folders.list(bookId)
      .then(setFolders)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFolders();

    const handleFolderRefresh = () => {
      fetchFolders();
    };

    window.addEventListener('refresh-folders', handleFolderRefresh);
    return () => {
      window.removeEventListener('refresh-folders', handleFolderRefresh);
    };
  }, [bookId]);

  const handleOpenCreate = (parentId: number | null) => {
    setModalType('create');
    setModalParentId(parentId);
    setModalInput('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenRename = (id: number, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('rename');
    setModalTargetId(id);
    setModalInput(currentName);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('delete');
    setModalTargetId(id);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async () => {
    setModalLoading(true);
    try {
      if (modalType === 'create') {
        const name = modalInput.trim();
        if (!name) return;
        await api.folders.create(bookId, name, modalParentId);
        if (modalParentId) {
          setExpanded(prev => new Set([...prev, modalParentId]));
        }
      } else if (modalType === 'rename' && modalTargetId !== null) {
        const name = modalInput.trim();
        if (!name) return;
        const folder = folders.find(f => f.id === modalTargetId);
        await api.folders.update(modalTargetId, name, folder?.parentId || null);
      } else if (modalType === 'delete' && modalTargetId !== null) {
        await api.folders.delete(modalTargetId);
        if (activeFolderId === modalTargetId) {
          navigate(`/books/${bookId}`);
        }
      }
      setIsModalOpen(false);
      fetchFolders();
    } catch (err) {
      setModalError(`Failed to ${modalType} folder.`);
    } finally {
      setModalLoading(false);
    }
  };

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildTree = (parentId: number | null): React.ReactNode[] => {
    return folders
      .filter(f => f.parentId === parentId)
      .map(folder => {
        const hasChildren = folders.some(f => f.parentId === folder.id);
        const isExpanded = expanded.has(folder.id);
        const isActive = activeFolderId === folder.id;

        return (
          <div key={folder.id} className="folder-node">
            <div 
              className={`folder-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(`/books/${bookId}?folderId=${folder.id}`)}
            >
              <div className="folder-item-left">
                {hasChildren ? (
                  <button className="folder-toggle" onClick={(e) => toggleExpand(folder.id, e)}>
                    {isExpanded ? '▼' : '▶'}
                  </button>
                ) : (
                  <span className="folder-toggle-empty" />
                )}
                <span className="folder-icon">📁</span>
                <span className="folder-name">{folder.name}</span>
                {folder._count?.notes ? (
                  <span className="folder-count">{folder._count.notes}</span>
                ) : null}
              </div>
              
              <div className="folder-actions">
                <button title="Add Subfolder" onClick={(e) => { e.stopPropagation(); handleOpenCreate(folder.id); }}>+</button>
                <button title="Rename" onClick={(e) => handleOpenRename(folder.id, folder.name, e)}>✎</button>
                <button title="Delete" onClick={(e) => handleOpenDelete(folder.id, e)}>✕</button>
              </div>
            </div>
            {isExpanded && hasChildren && (
              <div className="folder-children">
                {buildTree(folder.id)}
              </div>
            )}
          </div>
        );
      });
  };

  if (loading) return <div className="sidebar-loading"><div className="spinner" /></div>;

  return (
    <div className="folder-tree-container">
      <div className="folder-tree-header">
        <span className="folder-tree-label">Folders</span>
        <button className="btn-icon-small" onClick={() => handleOpenCreate(null)} title="New Root Folder">
          +
        </button>
      </div>
      
      <div className="folder-tree">
        {folders.filter(f => f.parentId === null).length === 0 ? (
          <p className="sidebar-empty">No folders.</p>
        ) : (
          buildTree(null)
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !modalLoading && setIsModalOpen(false)}
        title={
          modalType === 'create' ? 'Create Folder' :
          modalType === 'rename' ? 'Rename Folder' :
          'Delete Folder'
        }
        footer={
          <div className="flex gap-2 justify-end">
            <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)} disabled={modalLoading}>
              Cancel
            </button>
            <button 
              className={`btn ${modalType === 'delete' ? 'btn-danger' : 'btn-primary'}`} 
              onClick={handleModalSubmit}
              disabled={modalLoading || (modalType !== 'delete' && !modalInput.trim())}
            >
              {modalLoading ? 'Processing...' : modalType === 'create' ? 'Create' : modalType === 'rename' ? 'Rename' : 'Delete'}
            </button>
          </div>
        }
      >
        {modalType === 'delete' ? (
          <p>Are you sure you want to delete this folder and all its subfolders?</p>
        ) : (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Folder Name</label>
            <input
              className="input"
              autoFocus
              value={modalInput}
              onChange={e => setModalInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && modalInput.trim() && handleModalSubmit()}
              placeholder="e.g. Chapters"
            />
          </div>
        )}
        {modalError && <p className="ai-error" style={{ marginTop: 'var(--space-4)' }}>{modalError}</p>}
      </Modal>
    </div>
  );
}
