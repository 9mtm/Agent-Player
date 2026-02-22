'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { NodeData } from '../canvas.types';
import { Loader2, AlertCircle } from 'lucide-react';
import { CONFIGURATION_NODE_RADIUS } from '../canvas.constants';

export function TriggerNode({ data, selected }: NodeProps<NodeData>) {
  const size = CONFIGURATION_NODE_RADIUS * 2; // 80px circular node

  return (
    <div
      className={cn(
        'rounded-full border-2 transition-all',
        'flex flex-col justify-center items-center',
        'bg-green-50',
        selected ? 'border-green-500 shadow-lg' : 'border-green-400',
        data.isExecuting && 'animate-executing-pulse ring-2 ring-green-400',
        data.hasError && 'border-red-500 ring-2 ring-red-400/30 bg-red-50/50'
      )}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {/* Icon */}
      {data.icon && (
        <div className="text-2xl mb-0.5">{data.icon}</div>
      )}

      {/* Label */}
      <div className="font-semibold text-xs text-green-700 px-2 text-center">
        {data.label}
      </div>

      {/* Status Indicators */}
      {(data.isExecuting || data.hasError) && (
        <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5">
          {data.isExecuting && (
            <Loader2 className="w-3 h-3 animate-spin text-green-500" />
          )}
          {data.hasError && (
            <AlertCircle className="w-3 h-3 text-red-500" />
          )}
        </div>
      )}

      {/* Output Handle Only */}
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          'border-2 bg-white rounded-full',
          selected ? 'border-green-500' : 'border-green-400'
        )}
        style={{
          width: '10px',
          height: '10px',
          right: '-5px'
        }}
      />
    </div>
  );
}
