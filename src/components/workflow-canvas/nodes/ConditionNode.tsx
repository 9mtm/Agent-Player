'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { NodeData } from '../canvas.types';
import { Loader2, AlertCircle } from 'lucide-react';

export function ConditionNode({ data, selected }: NodeProps<NodeData>) {
  return (
    <div className="relative" style={{ width: '120px', height: '120px' }}>
      {/* Diamond Shape */}
      <div
        className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-[85px] h-[85px] rotate-45',
          'border-2 transition-all',
          'bg-yellow-50',
          selected ? 'border-yellow-500 shadow-lg' : 'border-yellow-400',
          data.isExecuting && 'animate-executing-pulse ring-2 ring-yellow-400',
          data.hasError && 'border-red-500 ring-2 ring-red-400/30'
        )}
      />

      {/* Content (Not rotated) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-10">
        {/* Icon */}
        {data.icon && (
          <div className="text-xl mb-0.5 text-yellow-700">{data.icon}</div>
        )}

        {/* Label */}
        <div className="font-semibold text-xs text-yellow-700 text-center px-2 max-w-[70px]">
          {data.label}
        </div>

        {/* Status Indicators */}
        {(data.isExecuting || data.hasError) && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white rounded-full p-0.5 shadow">
            {data.isExecuting && (
              <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
            )}
            {data.hasError && (
              <AlertCircle className="w-3 h-3 text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* Input Handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          'border-2 bg-white rounded-full',
          selected ? 'border-yellow-500' : 'border-yellow-400'
        )}
        style={{
          width: '10px',
          height: '10px',
          left: '0px',
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />

      {/* Output Handles (Top and Bottom for True/False) */}
      <Handle
        type="source"
        position={Position.Top}
        id="true"
        className={cn(
          'border-2 bg-white rounded-full',
          selected ? 'border-green-500' : 'border-green-400'
        )}
        style={{
          width: '10px',
          height: '10px',
          top: '5px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className={cn(
          'border-2 bg-white rounded-full',
          selected ? 'border-red-500' : 'border-red-400'
        )}
        style={{
          width: '10px',
          height: '10px',
          bottom: '5px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
    </div>
  );
}
