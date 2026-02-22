'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow, NodeResizer } from '@xyflow/react';
import type { NodeData } from '../canvas.types';
import { cn } from '@/lib/utils';
import { Pencil, Check, X } from 'lucide-react';
import { STICKY_DEFAULT_WIDTH, STICKY_MIN_HEIGHT } from '../canvas.constants';

export const NoteNode = memo(({ id, data, selected }: NodeProps<NodeData>) => {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(data.content || 'Double-click to edit...');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const bgColor = data.color || '#fef08a'; // Default yellow

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(() => {
    // Update node data
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, content } }
          : node
      )
    );
    setIsEditing(false);
  }, [id, content, setNodes]);

  const handleCancel = useCallback(() => {
    setContent(data.content || 'Double-click to edit...');
    setIsEditing(false);
  }, [data.content]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    }
  }, [handleCancel, handleSave]);

  return (
    <>
      {/* Resize Handles - only show when selected */}
      <NodeResizer
        isVisible={selected}
        minWidth={180}
        minHeight={80}
        handleStyle={{
          width: 8,
          height: 8,
          backgroundColor: '#fbbf24',
          border: '2px solid #f59e0b',
          borderRadius: '2px',
        }}
        lineStyle={{
          borderColor: '#f59e0b',
          borderWidth: 1,
        }}
      />
      <div
        className={cn(
          'rounded border shadow-sm transition-all h-full',
          'cursor-default',
          selected ? 'border-yellow-400 shadow-md' : 'border-yellow-200',
          isEditing && 'ring-1 ring-yellow-400'
        )}
        style={{
          backgroundColor: bgColor,
          minWidth: `${STICKY_DEFAULT_WIDTH}px`,
          minHeight: `${STICKY_MIN_HEIGHT}px`
        }}
        onDoubleClick={handleDoubleClick}
      >
      {/* Note Content */}
      <div className="p-2">
        {isEditing ? (
          <div className="space-y-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[70px] p-1.5 text-xs bg-white/70 border border-yellow-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-yellow-400"
              placeholder="Note..."
            />
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={handleCancel}
                className="p-1 hover:bg-yellow-200/50 rounded transition-colors"
                title="Cancel (Esc)"
              >
                <X className="w-3 h-3 text-gray-600" />
              </button>
              <button
                onClick={handleSave}
                className="p-1 hover:bg-yellow-200/50 rounded transition-colors"
                title="Save (Cmd+Enter)"
              >
                <Check className="w-3 h-3 text-gray-600" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-700 whitespace-pre-wrap break-words">
            {content}
          </div>
        )}
      </div>

      {/* No handles for notes - they don't connect */}
    </div>
    </>
  );
});

NoteNode.displayName = 'NoteNode';
