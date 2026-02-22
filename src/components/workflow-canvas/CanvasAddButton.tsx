'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CanvasAddButtonProps {
  onClick: () => void;
  position?: { x: number; y: number };
  showLabel?: boolean;
}

export function CanvasAddButton({
  onClick,
  position = { x: 176, y: 240 },
  showLabel = true
}: CanvasAddButtonProps) {
  return (
    <div
      className="absolute flex flex-col items-center justify-center"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 10,
      }}
    >
      <button
        onClick={onClick}
        className={cn(
          'min-w-[100px] min-h-[100px] w-[100px] h-[100px]',
          'bg-white border-2 border-dashed border-gray-400',
          'rounded-lg cursor-pointer',
          'flex items-center justify-center',
          'transition-all duration-200',
          'hover:border-primary hover:bg-gray-50',
          'group'
        )}
        data-test-id="canvas-add-button"
      >
        <Plus
          className="w-10 h-10 text-gray-400 group-hover:text-primary transition-colors"
          strokeWidth={2}
        />
      </button>
      {showLabel && (
        <p className="mt-2 text-sm font-medium text-gray-700">
          Add first step
        </p>
      )}
    </div>
  );
}
