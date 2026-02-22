/**
 * Widget Wrapper
 * Wraps dashboard widgets with drag handle and remove button
 */

'use client';

import { ReactNode } from 'react';
import { GripVertical, X } from 'lucide-react';
import { Button } from '../ui/button';

interface WidgetWrapperProps {
  widget: {
    id: string;
    name: string;
  };
  onRemove: () => void;
  children: ReactNode;
}

export function WidgetWrapper({ widget, onRemove, children }: WidgetWrapperProps) {
  return (
    <div className="h-full w-full flex flex-col border rounded-lg bg-card shadow-sm overflow-hidden">
      {/* Widget Header with Drag Handle */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 drag-handle cursor-move">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{widget.name}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Widget Content */}
      <div className="flex-1 overflow-auto p-4">
        {children}
      </div>
    </div>
  );
}
