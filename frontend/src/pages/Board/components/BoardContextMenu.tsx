import React, { useEffect, useRef } from 'react';
import type { ContextMenuState } from './hooks/useBoardContextMenu';

interface BoardContextMenuProps {
  contextMenu: ContextMenuState | null;
  onDelete: () => void;
  onClose: () => void;
}

const BoardContextMenu: React.FC<BoardContextMenuProps> = ({ contextMenu, onDelete, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contextMenu && menuRef.current) {
      menuRef.current.focus();
    }
  }, [contextMenu]);

  if (!contextMenu) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: contextMenu.x,
        top: contextMenu.y,
        zIndex: 1000,
        background: '#fff',
        border: '1.5px solid #bbb',
        borderRadius: 8,
        boxShadow: '0 2px 12px #0002',
        minWidth: 120,
        padding: '6px 0',
      }}
      onClick={e => e.stopPropagation()}
      role="menu"
      aria-label={
        contextMenu.type === 'node'
          ? 'Node context menu'
          : contextMenu.type === 'edge'
          ? 'Edge context menu'
          : 'Board context menu'
      }
      tabIndex={-1}
      onKeyDown={e => {
        // Keyboard navigation for context menu
        const items = Array.from(document.querySelectorAll('.context-menu-item'));
        const current = document.activeElement;
        const idx = items.indexOf(current as HTMLElement);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = items[(idx + 1) % items.length] as HTMLElement;
          next?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = items[(idx - 1 + items.length) % items.length] as HTMLElement;
          prev?.focus();
        } else if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'Enter' && current) {
          (current as HTMLElement).click();
        }
      }}
    >
      {(contextMenu.type === 'node' || contextMenu.type === 'edge') && (
        <div
          className="context-menu-item"
          style={{ padding: '8px 18px', cursor: 'pointer', color: '#d32f2f', fontWeight: 600, fontSize: 15 }}
          onClick={onDelete}
          role="menuitem"
          tabIndex={0}
          title="Delete"
          aria-label="Delete"
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') onDelete();
          }}
          autoFocus
        >
          Delete
        </div>
      )}
      {contextMenu.type === 'board' && (
        <div
          className="context-menu-item"
          style={{ padding: '8px 18px', color: '#888', fontSize: 14 }}
          role="menuitem"
          tabIndex={0}
          title="Board menu"
          aria-label="Board menu"
          autoFocus
        >
          Board Menu
        </div>
      )}
    </div>
  );
};

export default BoardContextMenu; 