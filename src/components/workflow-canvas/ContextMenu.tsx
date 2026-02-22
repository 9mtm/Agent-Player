'use client';

import { useCallback, useEffect, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import {
  Copy,
  Clipboard,
  Trash2,
  Edit,
  Play,
  Unplug,
  Plus,
  StickyNote,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ContextMenuProps {
  id: string;
  top: number;
  left: number;
  right?: number;
  bottom?: number;
  onCopy?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
  onExecute?: () => void;
  onDisconnect?: () => void;
  onAddNode?: (type: string) => void;
  onAddNote?: () => void;
  onSettings?: () => void;
  type: 'node' | 'canvas' | 'edge';
  hasClipboard?: boolean;
}

export function ContextMenu({
  id,
  top,
  left,
  right,
  bottom,
  onCopy,
  onPaste,
  onDelete,
  onDuplicate,
  onEdit,
  onExecute,
  onDisconnect,
  onAddNode,
  onAddNote,
  onSettings,
  type,
  hasClipboard = false,
  ...props
}: ContextMenuProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleClickOutside = () => setIsVisible(false);
    const handleScroll = () => setIsVisible(false);

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('wheel', handleScroll);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('wheel', handleScroll);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      style={{ top, left, right, bottom }}
      className={cn(
        'absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200',
        'min-w-[200px] py-1 animate-in fade-in zoom-in-95 duration-100'
      )}
      {...props}
    >
      {type === 'node' && (
        <>
          <MenuItem
            icon={<Play className="w-4 h-4" />}
            label="Execute Node"
            onClick={onExecute}
            shortcut="Ctrl+Enter"
          />
          <MenuItem
            icon={<Edit className="w-4 h-4" />}
            label="Edit"
            onClick={onEdit}
            shortcut="E"
          />
          <MenuDivider />
          <MenuItem
            icon={<Copy className="w-4 h-4" />}
            label="Copy"
            onClick={onCopy}
            shortcut="Ctrl+C"
          />
          <MenuItem
            icon={<Clipboard className="w-4 h-4" />}
            label="Duplicate"
            onClick={onDuplicate}
            shortcut="Ctrl+D"
          />
          <MenuItem
            icon={<Clipboard className="w-4 h-4" />}
            label="Paste"
            onClick={onPaste}
            disabled={!hasClipboard}
            shortcut="Ctrl+V"
          />
          <MenuDivider />
          <MenuItem
            icon={<Unplug className="w-4 h-4" />}
            label="Disconnect"
            onClick={onDisconnect}
          />
          <MenuItem
            icon={<Settings className="w-4 h-4" />}
            label="Settings"
            onClick={onSettings}
          />
          <MenuDivider />
          <MenuItem
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete"
            onClick={onDelete}
            shortcut="Del"
            danger
          />
        </>
      )}

      {type === 'canvas' && (
        <>
          <MenuItem
            icon={<Plus className="w-4 h-4" />}
            label="Add Node"
            onClick={() => onAddNode?.('action')}
            hasSubmenu
          />
          <MenuItem
            icon={<StickyNote className="w-4 h-4" />}
            label="Add Note"
            onClick={onAddNote}
          />
          <MenuDivider />
          <MenuItem
            icon={<Clipboard className="w-4 h-4" />}
            label="Paste"
            onClick={onPaste}
            disabled={!hasClipboard}
            shortcut="Ctrl+V"
          />
        </>
      )}

      {type === 'edge' && (
        <>
          <MenuItem
            icon={<Plus className="w-4 h-4" />}
            label="Add Node"
            onClick={() => onAddNode?.('action')}
          />
          <MenuDivider />
          <MenuItem
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete Connection"
            onClick={onDelete}
            shortcut="Del"
            danger
          />
        </>
      )}
    </div>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  hasSubmenu?: boolean;
}

function MenuItem({
  icon,
  label,
  onClick,
  shortcut,
  disabled = false,
  danger = false,
  hasSubmenu = false
}: MenuItemProps) {
  return (
    <button
      className={cn(
        'w-full px-3 py-2 flex items-center gap-3 text-sm',
        'hover:bg-gray-100 transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        danger && 'text-red-600 hover:bg-red-50'
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && onClick) {
          onClick();
        }
      }}
      disabled={disabled}
    >
      <span className="text-gray-600">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="text-xs text-gray-400">{shortcut}</span>
      )}
      {hasSubmenu && (
        <span className="text-gray-400">›</span>
      )}
    </button>
  );
}

function MenuDivider() {
  return <div className="h-px bg-gray-200 my-1" />;
}
