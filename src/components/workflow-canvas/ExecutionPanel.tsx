'use client';

import { useState } from 'react';
import { X, Play, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ExecutionResult {
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startTime?: number;
  endTime?: number;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
}

export interface ExecutionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  executionResults: ExecutionResult[];
  onRerun?: () => void;
}

export function ExecutionPanel({ isOpen, onClose, executionResults, onRerun }: ExecutionPanelProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  const totalDuration = executionResults.reduce((sum, result) => sum + (result.duration || 0), 0);
  const successCount = executionResults.filter((r) => r.status === 'success').length;
  const errorCount = executionResults.filter((r) => r.status === 'error').length;
  const isExecuting = executionResults.some((r) => r.status === 'running' || r.status === 'pending');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 w-[450px] bg-white shadow-2xl z-50',
          'border-l border-gray-200 flex flex-col',
          'animate-in slide-in-from-right duration-300'
        )}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Execution Results</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>{successCount} success</span>
            </div>
            {errorCount > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <XCircle className="w-4 h-4" />
                <span>{errorCount} error</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{(totalDuration / 1000).toFixed(2)}s</span>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto">
          {executionResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
              <Play className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-center">No execution results yet</p>
              <p className="text-sm text-center mt-1">
                Run the workflow to see results here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {executionResults.map((result) => (
                <ExecutionResultItem
                  key={result.nodeId}
                  result={result}
                  isExpanded={expandedNodes.has(result.nodeId)}
                  onToggle={() => toggleExpanded(result.nodeId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {executionResults.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {executionResults.length} {executionResults.length === 1 ? 'node' : 'nodes'} executed
            </div>
            {onRerun && !isExecuting && (
              <Button size="sm" onClick={onRerun}>
                <Play className="w-4 h-4 mr-2" />
                Run Again
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function ExecutionResultItem({
  result,
  isExpanded,
  onToggle,
}: {
  result: ExecutionResult;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50' },
    running: { icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
    success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  };

  const config = statusConfig[result.status];
  const Icon = config.icon;

  return (
    <div className={cn('p-4', config.bg)}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <Icon className={cn('w-5 h-5', config.color)} />
          <div className="text-left">
            <div className="font-medium text-gray-900">{result.nodeName}</div>
            <div className="text-xs text-gray-500">
              {result.status === 'running' && 'Executing...'}
              {result.status === 'pending' && 'Waiting...'}
              {result.duration !== undefined && `${(result.duration / 1000).toFixed(2)}s`}
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Error */}
          {result.error && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-gray-700">Error Details</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(result.error || '');
                    toast.success('Error copied to clipboard');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-xs text-red-800 font-medium mb-1">
                  Error Message
                </div>
                <div className="text-xs text-red-700 font-mono bg-red-100 p-2 rounded">
                  {result.error}
                </div>
                {result.nodeId && (
                  <div className="mt-2 text-xs text-red-600">
                    <span className="font-medium">Node ID:</span> {result.nodeId}
                  </div>
                )}
                {result.duration !== undefined && (
                  <div className="text-xs text-red-600">
                    <span className="font-medium">Failed after:</span> {(result.duration / 1000).toFixed(2)}s
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input */}
          {result.input !== undefined && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Input</div>
              <div className="p-2 bg-white border border-gray-200 rounded">
                <pre className="text-xs font-mono text-gray-700 overflow-x-auto">
                  {JSON.stringify(result.input, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Output */}
          {result.output !== undefined && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Output</div>
              <div className="p-2 bg-white border border-gray-200 rounded">
                <pre className="text-xs font-mono text-gray-700 overflow-x-auto">
                  {JSON.stringify(result.output, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
