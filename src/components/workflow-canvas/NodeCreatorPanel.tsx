'use client';

import { useState } from 'react';
import { X, Search, Zap, PlayCircle, Split, Repeat, Clock, Wrench, StickyNote, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NodeType } from './canvas.types';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NodeCreatorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (type: NodeType) => void;
}

interface NodeCategory {
  id: string;
  label: string;
  nodes: Array<{
    type: NodeType;
    label: string;
    description: string;
    icon: React.ReactNode;
  }>;
}

const CATEGORIES: NodeCategory[] = [
  {
    id: 'triggers',
    label: 'Triggers',
    nodes: [
      {
        type: 'trigger' as NodeType,
        label: 'Trigger',
        description: 'Start your workflow',
        icon: <PlayCircle className="w-5 h-5" />,
      },
    ],
  },
  {
    id: 'actions',
    label: 'Actions',
    nodes: [
      {
        type: 'action' as NodeType,
        label: 'Action',
        description: 'Perform an action',
        icon: <Zap className="w-5 h-5" />,
      },
      {
        type: 'transform' as NodeType,
        label: 'Transform',
        description: 'Transform data',
        icon: <Wrench className="w-5 h-5" />,
      },
    ],
  },
  {
    id: 'flow-control',
    label: 'Flow Control',
    nodes: [
      {
        type: 'condition' as NodeType,
        label: 'Condition',
        description: 'Split workflow based on conditions',
        icon: <Split className="w-5 h-5" />,
      },
      {
        type: 'loop' as NodeType,
        label: 'Loop',
        description: 'Repeat actions',
        icon: <Repeat className="w-5 h-5" />,
      },
      {
        type: 'delay' as NodeType,
        label: 'Delay',
        description: 'Wait before continuing',
        icon: <Clock className="w-5 h-5" />,
      },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    nodes: [
      {
        type: 'note' as NodeType,
        label: 'Sticky Note',
        description: 'Add a note to your workflow',
        icon: <StickyNote className="w-5 h-5" />,
      },
    ],
  },
];

export function NodeCreatorPanel({ isOpen, onClose, onSelectNode }: NodeCreatorPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredCategories = CATEGORIES.map(category => ({
    ...category,
    nodes: category.nodes.filter(node =>
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.nodes.length > 0);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 w-[380px] bg-white shadow-2xl z-50',
          'transform transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Node</h2>
            <p className="text-sm text-gray-500">Choose a node to add to your workflow</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Categories & Nodes */}
        <ScrollArea className="h-[calc(100vh-160px)]">
          <div className="p-4 space-y-6">
            {filteredCategories.map((category) => (
              <div key={category.id}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {category.label}
                </h3>
                <div className="space-y-2">
                  {category.nodes.map((node) => (
                    <button
                      key={node.type}
                      onClick={() => {
                        onSelectNode(node.type);
                        onClose();
                      }}
                      className={cn(
                        'w-full flex items-start gap-3 p-3 rounded-lg',
                        'border border-gray-200 bg-white',
                        'hover:border-primary hover:bg-primary/5',
                        'transition-all duration-200',
                        'text-left group'
                      )}
                    >
                      <div className="flex-shrink-0 mt-0.5 text-gray-400 group-hover:text-primary transition-colors">
                        {node.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 group-hover:text-primary transition-colors">
                          {node.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {node.description}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Plus className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No nodes found</p>
                <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Press Tab to open node creator</span>
            <span>Shift+S for sticky note</span>
          </div>
        </div>
      </div>
    </>
  );
}
