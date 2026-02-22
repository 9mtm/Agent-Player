'use client';

import { Plus, Search, StickyNote, PanelRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FloatingActionButtonsProps {
  onAddNode: () => void;
  onSearch: () => void;
  onAddSticky: () => void;
  onTogglePanel?: () => void;
  isPanelActive?: boolean;
}

export function FloatingActionButtons({
  onAddNode,
  onSearch,
  onAddSticky,
  onTogglePanel,
  isPanelActive = false,
}: FloatingActionButtonsProps) {
  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
      <TooltipProvider>
        {/* Add Node Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onAddNode}
              className={cn(
                'w-12 h-12 rounded-lg',
                'bg-white border border-gray-300 shadow-lg',
                'flex items-center justify-center',
                'hover:bg-gray-50 hover:border-primary',
                'transition-all duration-200',
                'group'
              )}
              data-test-id="floating-add-button"
            >
              <Plus className="w-5 h-5 text-gray-600 group-hover:text-primary transition-colors" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Add Node <kbd className="ml-2 text-xs">Tab</kbd></p>
          </TooltipContent>
        </Tooltip>

        {/* Search Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onSearch}
              className={cn(
                'w-12 h-12 rounded-lg',
                'bg-white border border-gray-300 shadow-lg',
                'flex items-center justify-center',
                'hover:bg-gray-50 hover:border-primary',
                'transition-all duration-200',
                'group'
              )}
              data-test-id="floating-search-button"
            >
              <Search className="w-5 h-5 text-gray-600 group-hover:text-primary transition-colors" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Search <kbd className="ml-2 text-xs">Ctrl+K</kbd></p>
          </TooltipContent>
        </Tooltip>

        {/* Sticky Note Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onAddSticky}
              className={cn(
                'w-12 h-12 rounded-lg',
                'bg-white border border-gray-300 shadow-lg',
                'flex items-center justify-center',
                'hover:bg-gray-50 hover:border-primary',
                'transition-all duration-200',
                'group'
              )}
              data-test-id="floating-sticky-button"
            >
              <StickyNote className="w-5 h-5 text-gray-600 group-hover:text-primary transition-colors" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Sticky Note <kbd className="ml-2 text-xs">Shift+S</kbd></p>
          </TooltipContent>
        </Tooltip>

        {/* Toggle Panel Button */}
        {onTogglePanel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onTogglePanel}
                className={cn(
                  'w-12 h-12 rounded-lg',
                  'border shadow-lg',
                  'flex items-center justify-center',
                  'transition-all duration-200',
                  'group',
                  isPanelActive
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white border-gray-300 hover:bg-gray-50 hover:border-primary'
                )}
                data-test-id="floating-panel-button"
              >
                <PanelRight
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isPanelActive ? 'text-white' : 'text-gray-600 group-hover:text-primary'
                  )}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Focus Panel <kbd className="ml-2 text-xs">Shift+F</kbd></p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
}
