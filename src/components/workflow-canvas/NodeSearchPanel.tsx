'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NodeType } from './canvas.types';

interface NodeSearchItem {
  type: NodeType;
  label: string;
  icon: string;
  description: string;
  color: string;
  keywords: string[];
}

const SEARCHABLE_NODES: NodeSearchItem[] = [
  {
    type: 'trigger',
    label: 'Trigger',
    icon: '🎯',
    description: 'Start your workflow',
    color: 'bg-green-100',
    keywords: ['start', 'begin', 'trigger', 'webhook', 'schedule', 'cron', 'event'],
  },
  {
    type: 'action',
    label: 'Action',
    icon: '⚡',
    description: 'Perform an action',
    color: 'bg-blue-100',
    keywords: ['action', 'http', 'api', 'request', 'email', 'webhook', 'database'],
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: '🔀',
    description: 'Conditional branching',
    color: 'bg-yellow-100',
    keywords: ['condition', 'if', 'else', 'branch', 'decision', 'switch', 'case'],
  },
  {
    type: 'loop',
    label: 'Loop',
    icon: '🔁',
    description: 'Iterate over items',
    color: 'bg-purple-100',
    keywords: ['loop', 'foreach', 'repeat', 'iterate', 'array', 'map'],
  },
  {
    type: 'delay',
    label: 'Delay',
    icon: '⏰',
    description: 'Wait for a specified time',
    color: 'bg-orange-100',
    keywords: ['delay', 'wait', 'sleep', 'pause', 'timeout', 'timer'],
  },
  {
    type: 'transform',
    label: 'Transform',
    icon: '🔧',
    description: 'Transform and manipulate data',
    color: 'bg-pink-100',
    keywords: ['transform', 'map', 'filter', 'modify', 'process', 'data', 'code', 'function'],
  },
  {
    type: 'note',
    label: 'Note',
    icon: '📝',
    description: 'Add a sticky note',
    color: 'bg-yellow-200',
    keywords: ['note', 'comment', 'documentation', 'memo', 'sticky', 'text'],
  },
];

export interface NodeSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (type: NodeType) => void;
}

export function NodeSearchPanel({ isOpen, onClose, onSelectNode }: NodeSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter nodes based on search query
  const filteredNodes = searchQuery.trim()
    ? SEARCHABLE_NODES.filter((node) => {
        const query = searchQuery.toLowerCase();
        return (
          node.label.toLowerCase().includes(query) ||
          node.description.toLowerCase().includes(query) ||
          node.keywords.some((keyword) => keyword.includes(query))
        );
      })
    : SEARCHABLE_NODES;

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (type: NodeType) => {
      onSelectNode(type);
      onClose();
      setSearchQuery('');
    },
    [onSelectNode, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredNodes.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredNodes[selectedIndex]) {
          handleSelect(filteredNodes[selectedIndex].type);
        }
      }
    },
    [onClose, filteredNodes, selectedIndex, handleSelect]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] pointer-events-none">
        <div
          className={cn(
            'bg-white rounded-lg shadow-2xl w-full max-w-2xl pointer-events-auto',
            'animate-in zoom-in-95 slide-in-from-top-10 duration-200'
          )}
        >
          {/* Search Input */}
          <div className="relative flex items-center px-4 py-3 border-b border-gray-200">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input
              ref={inputRef}
              type="text"
              className="flex-1 text-base outline-none placeholder:text-gray-400"
              placeholder="Search for nodes... (try 'http', 'loop', 'if', etc.)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors ml-2"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="max-h-[400px] overflow-y-auto py-2"
          >
            {filteredNodes.length > 0 ? (
              filteredNodes.map((node, index) => (
                <button
                  key={node.type}
                  className={cn(
                    'w-full px-4 py-3 flex items-center gap-3 transition-colors',
                    'hover:bg-gray-50',
                    selectedIndex === index && 'bg-blue-50'
                  )}
                  onClick={() => handleSelect(node.type)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-xl',
                      node.color
                    )}
                  >
                    {node.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">{node.label}</div>
                    <div className="text-sm text-gray-500">{node.description}</div>
                  </div>
                  {selectedIndex === index && (
                    <div className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
                      Enter
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                <p>No nodes found</p>
                <p className="text-sm mt-1">Try searching for something else</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Enter</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Esc</kbd>
                Close
              </span>
            </div>
            <div className="text-gray-400">
              {filteredNodes.length} {filteredNodes.length === 1 ? 'result' : 'results'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
