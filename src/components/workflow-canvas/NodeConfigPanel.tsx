'use client';

import { useCallback, useState } from 'react';
import type { NodeData } from './canvas.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Save, Play, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NodeConfigPanelProps {
  node: {
    id: string;
    type: string;
    data: NodeData;
  } | null;
  onUpdate: (nodeId: string, data: Partial<NodeData>) => void;
  onClose: () => void;
  onExecute?: (nodeId: string) => void;
}

export function NodeConfigPanel({ node, onUpdate, onClose, onExecute }: NodeConfigPanelProps) {
  const [formData, setFormData] = useState<Partial<NodeData>>(node?.data || {});

  const handleSave = useCallback(() => {
    if (node) {
      onUpdate(node.id, formData);
      onClose();
    }
  }, [node, formData, onUpdate, onClose]);

  const handleExecute = useCallback(() => {
    if (node && onExecute) {
      onExecute(node.id);
    }
  }, [node, onExecute]);

  if (!node) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Side Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 w-[400px] bg-white shadow-2xl z-50',
          'border-l border-gray-200 flex flex-col',
          'animate-in slide-in-from-right duration-300'
        )}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{node.data.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{node.data.label}</h3>
              <p className="text-xs text-gray-500">{node.type} node</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Common Fields */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Node Name</label>
            <Input
              value={formData.label || ''}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="Enter node name..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <Input
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter description..."
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-4 h-4 text-gray-600" />
              <h4 className="font-medium text-gray-900">Node Settings</h4>
            </div>

            {/* Type-specific settings */}
            {node.type === 'action' && <ActionNodeSettings formData={formData} setFormData={setFormData} />}
            {node.type === 'condition' && <ConditionNodeSettings formData={formData} setFormData={setFormData} />}
            {node.type === 'delay' && <DelayNodeSettings formData={formData} setFormData={setFormData} />}
            {node.type === 'loop' && <LoopNodeSettings formData={formData} setFormData={setFormData} />}
            {node.type === 'transform' && <TransformNodeSettings formData={formData} setFormData={setFormData} />}
            {node.type === 'trigger' && <TriggerNodeSettings formData={formData} setFormData={setFormData} />}
            {node.type === 'note' && <NoteNodeSettings formData={formData} setFormData={setFormData} />}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {onExecute && node.type !== 'note' && (
              <Button variant="outline" onClick={handleExecute}>
                <Play className="w-4 h-4 mr-2" />
                Test
              </Button>
            )}
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// Type-specific settings components

function ActionNodeSettings({ formData, setFormData }: any) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Action Type</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          value={formData.actionType || 'http-request'}
          onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
        >
          <option value="http-request">HTTP Request</option>
          <option value="email">Send Email</option>
          <option value="webhook">Webhook</option>
          <option value="database">Database Query</option>
          <option value="custom">Custom Script</option>
        </select>
      </div>
    </div>
  );
}

function ConditionNodeSettings({ formData, setFormData }: any) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Condition</label>
        <Input
          value={formData.condition || ''}
          onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
          placeholder="e.g., status === 'success'"
        />
      </div>
      <p className="text-xs text-gray-500">
        Use JavaScript expressions (e.g., <code>data.value &gt; 10</code>)
      </p>
    </div>
  );
}

function DelayNodeSettings({ formData, setFormData }: any) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Delay Duration (seconds)</label>
        <Input
          type="number"
          min="1"
          value={formData.delay || 5}
          onChange={(e) => setFormData({ ...formData, delay: parseInt(e.target.value) })}
        />
      </div>
    </div>
  );
}

function LoopNodeSettings({ formData, setFormData }: any) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Loop Count</label>
        <Input
          type="number"
          min="1"
          value={formData.loopCount || 10}
          onChange={(e) => setFormData({ ...formData, loopCount: parseInt(e.target.value) })}
        />
      </div>
      <p className="text-xs text-gray-500">
        Or loop over array items by leaving this empty
      </p>
    </div>
  );
}

function TransformNodeSettings({ formData, setFormData }: any) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Transform Code</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
          rows={6}
          value={formData.parameters?.code || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              parameters: { ...formData.parameters, code: e.target.value },
            })
          }
          placeholder="return { ...data, transformed: true };"
        />
      </div>
      <p className="text-xs text-gray-500">
        JavaScript code to transform data
      </p>
    </div>
  );
}

function TriggerNodeSettings({ formData, setFormData }: any) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Trigger Type</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          value={formData.parameters?.triggerType || 'manual'}
          onChange={(e) =>
            setFormData({
              ...formData,
              parameters: { ...formData.parameters, triggerType: e.target.value },
            })
          }
        >
          <option value="manual">Manual</option>
          <option value="schedule">Schedule (Cron)</option>
          <option value="webhook">Webhook</option>
          <option value="event">Event</option>
        </select>
      </div>

      {formData.parameters?.triggerType === 'schedule' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Cron Expression</label>
          <Input
            value={formData.parameters?.cronExpression || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                parameters: { ...formData.parameters, cronExpression: e.target.value },
              })
            }
            placeholder="0 9 * * *"
          />
          <p className="text-xs text-gray-500">
            e.g., <code>0 9 * * *</code> (every day at 9 AM)
          </p>
        </div>
      )}
    </div>
  );
}

function NoteNodeSettings({ formData, setFormData }: any) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Note Content</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          rows={6}
          value={formData.content || ''}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Type your note here..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Background Color</label>
        <div className="flex items-center gap-2">
          {['#fef08a', '#fecaca', '#bfdbfe', '#d9f99d', '#e9d5ff', '#fed7aa'].map((color) => (
            <button
              key={color}
              className={cn(
                'w-8 h-8 rounded-md border-2 transition-all',
                formData.color === color ? 'border-gray-900 scale-110' : 'border-gray-300'
              )}
              style={{ backgroundColor: color }}
              onClick={() => setFormData({ ...formData, color })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
