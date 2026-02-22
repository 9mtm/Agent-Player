'use client';

import { useEffect, useCallback } from 'react';

interface UseKeyboardShortcutsProps {
  onCopy?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSelectAll?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function useKeyboardShortcuts({
  onCopy,
  onPaste,
  onDelete,
  onDuplicate,
  onSelectAll,
  onUndo,
  onRedo,
}: UseKeyboardShortcutsProps) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check if user is typing in input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const metaKey = isMac ? event.metaKey : event.ctrlKey;

    // Delete: Backspace or Delete key
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      onDelete?.();
    }

    // Copy: Ctrl+C (Cmd+C on Mac)
    else if (metaKey && event.key === 'c') {
      event.preventDefault();
      onCopy?.();
    }

    // Paste: Ctrl+V (Cmd+V on Mac)
    else if (metaKey && event.key === 'v') {
      event.preventDefault();
      onPaste?.();
    }

    // Cut: Ctrl+X (Cmd+X on Mac)
    else if (metaKey && event.key === 'x') {
      event.preventDefault();
      onCopy?.();
      onDelete?.();
    }

    // Duplicate: Ctrl+D (Cmd+D on Mac)
    else if (metaKey && event.key === 'd') {
      event.preventDefault();
      onDuplicate?.();
    }

    // Select All: Ctrl+A (Cmd+A on Mac)
    else if (metaKey && event.key === 'a') {
      event.preventDefault();
      onSelectAll?.();
    }

    // Undo: Ctrl+Z (Cmd+Z on Mac)
    else if (metaKey && !event.shiftKey && event.key === 'z') {
      event.preventDefault();
      onUndo?.();
    }

    // Redo: Ctrl+Shift+Z or Ctrl+Y
    else if ((metaKey && event.shiftKey && event.key === 'z') || (metaKey && event.key === 'y')) {
      event.preventDefault();
      onRedo?.();
    }
  }, [onCopy, onPaste, onDelete, onDuplicate, onSelectAll, onUndo, onRedo]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
