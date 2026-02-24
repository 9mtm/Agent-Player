'use client';

import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  BackgroundVariant,
  Panel,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '@/styles/workflow-theme.css';
import dagre from '@dagrejs/dagre';

import { nodeTypes } from './nodes';
import { CustomEdge } from './CustomEdge';
import type { CanvasNode, CanvasEdge, NodeType, NodeData, WorkflowCanvasProps } from './canvas.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Play, Save, Maximize2, Undo2, Redo2, Copy, Clipboard, Trash2, AlertTriangle, ChevronLeft, Target, Zap, GitBranch, Repeat, Clock, Wrench, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useClipboard } from './hooks/useClipboard';
import { ContextMenu } from './ContextMenu';
import { NodeConfigPanel } from './NodeConfigPanel';
import { NodeSearchPanel } from './NodeSearchPanel';
import { ExecutionPanel, type ExecutionResult } from './ExecutionPanel';
import { NodeCreatorPanel } from './NodeCreatorPanel';
import { FloatingActionButtons } from './FloatingActionButtons';
import { CanvasAddButton } from './CanvasAddButton';
import { toast } from 'sonner';
import { NODE_WIDTH, NODE_HEIGHT, NODE_SPACING_X, NODE_SPACING_Y } from './canvas.constants';

const getLayoutedElements = (nodes: CanvasNode[], edges: CanvasEdge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: NODE_SPACING_X, nodesep: NODE_SPACING_Y });

  nodes.forEach((node) => dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

const edgeTypes = {
  default: CustomEdge,
  smoothstep: CustomEdge,
};

const NODE_PALETTE: Array<{ type: NodeType; label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = [
  { type: 'trigger' as NodeType, label: 'Trigger', icon: Target, color: 'bg-green-100' },
  { type: 'action' as NodeType, label: 'Action', icon: Zap, color: 'bg-blue-100' },
  { type: 'condition' as NodeType, label: 'Condition', icon: GitBranch, color: 'bg-yellow-100' },
  { type: 'loop' as NodeType, label: 'Loop', icon: Repeat, color: 'bg-purple-100' },
  { type: 'delay' as NodeType, label: 'Delay', icon: Clock, color: 'bg-orange-100' },
  { type: 'transform' as NodeType, label: 'Transform', icon: Wrench, color: 'bg-pink-100' },
  { type: 'note' as NodeType, label: 'Note', icon: FileText, color: 'bg-yellow-200' },
];

export function WorkflowCanvas({
  workflowId,
  readOnly = false,
  onSave,
  onExecute,
  workflowName,
  onWorkflowNameChange,
  onBack,
  initialNodes = [],
  initialEdges = []
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CanvasEdge>(initialEdges);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    type: 'node' | 'canvas' | 'edge';
    targetId?: string;
  } | null>(null);

  // Node Config Panel state
  const [selectedNodeForConfig, setSelectedNodeForConfig] = useState<CanvasNode | null>(null);

  // Node Search Panel state
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);

  // Node Creator Panel state
  const [isNodeCreatorOpen, setIsNodeCreatorOpen] = useState(false);

  // Execution Panel state
  const [isExecutionPanelOpen, setIsExecutionPanelOpen] = useState(false);
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);

  // Delete Confirmation Dialog state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    nodeCount: number;
    edgeCount: number;
    hasConnections: boolean;
  } | null>(null);

  // Undo/Redo
  const { takeSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo(nodes, edges);

  // Clipboard
  const { copy: copyToClipboard, paste: pasteFromClipboard, hasClipboard } = useClipboard();

  // Take snapshot on every change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nodes.length > 0 || edges.length > 0) {
        takeSnapshot(nodes, edges);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [nodes, edges, takeSnapshot]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id: `${params.source}-to-${params.target}`, // Custom ID format for CustomEdge
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const addNode = useCallback(
    (type: NodeType, position?: { x: number; y: number }) => {
      const id = `${type}-${Date.now()}`;
      const paletteItem = NODE_PALETTE.find((item) => item.type === type);

      const newNode: CanvasNode = {
        id,
        type,
        position: position || {
          x: Math.random() * 300 + 100,
          y: Math.random() * 200 + 100,
        },
        data: {
          label: paletteItem?.label || type,
          type,
          icon: paletteItem?.icon,
          description: type === 'note' ? undefined : `${paletteItem?.label || type} node`,
          content: type === 'note' ? 'Double-click to edit...' : undefined,
          color: type === 'note' ? '#fef08a' : undefined,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      toast.success(`${paletteItem?.label} added`);
    },
    [setNodes]
  );

  const updateNodeData = useCallback((nodeId: string, newData: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
  }, [setNodes]);

  const handleNodeClick = useCallback((_event: any, node: CanvasNode) => {
    setSelectedNodeForConfig(node);
  }, []);

  const handleAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    toast.success('Layout applied');
  }, [nodes, edges, setNodes, setEdges]);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(nodes, edges);
    }
  }, [nodes, edges, onSave]);

  const handleExecute = useCallback(async () => {
    if (onExecute) {
      onExecute();
    }

    // Mock execution for demo
    if (nodes.length === 0) {
      toast.error('No nodes to execute');
      return;
    }

    setIsExecutionPanelOpen(true);
    setExecutionResults([]);

    // Initialize execution results
    const results: ExecutionResult[] = nodes.map((node) => ({
      nodeId: node.id,
      nodeName: node.data.label,
      status: 'pending',
    }));

    setExecutionResults(results);

    // Simulate execution (in real implementation, this would call backend)
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const startTime = Date.now();

      // Update to running
      setExecutionResults((prev) =>
        prev.map((r) =>
          r.nodeId === node.id ? { ...r, status: 'running', startTime } : r
        )
      );

      // Mark node as executing
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id ? { ...n, data: { ...n.data, isExecuting: true } } : n
        )
      );

      // Simulate work
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Randomly success or error (90% success)
      const isSuccess = Math.random() > 0.1;

      // Update result
      setExecutionResults((prev) =>
        prev.map((r) =>
          r.nodeId === node.id
            ? {
                ...r,
                status: isSuccess ? 'success' : 'error',
                endTime,
                duration,
                input: { example: 'input data' },
                output: isSuccess ? { result: 'success', data: { value: 42 } } : undefined,
                error: isSuccess ? undefined : 'Mock error: Something went wrong',
              }
            : r
        )
      );

      // Update node
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? {
                ...n,
                data: {
                  ...n.data,
                  isExecuting: false,
                  hasError: !isSuccess,
                  errorMessage: isSuccess ? undefined : 'Execution failed',
                },
              }
            : n
        )
      );

      if (!isSuccess) {
        toast.error(`${node.data.label} failed`);
        break; // Stop execution on error
      }
    }

    toast.success('Workflow execution completed');
  }, [nodes, setNodes, onExecute]);

  // Check if selected nodes have connections
  const getSelectedNodesInfo = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));

    // Check if any selected node has connections
    const hasConnections = edges.some(
      (e) => selectedNodeIds.has(e.source) || selectedNodeIds.has(e.target)
    );

    return { selectedNodes, selectedEdges, hasConnections };
  }, [nodes, edges]);

  // Delete selected nodes/edges - with confirmation for connected nodes
  const handleDelete = useCallback(() => {
    const { selectedNodes, selectedEdges, hasConnections } = getSelectedNodesInfo();

    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      toast.info('No nodes or edges selected');
      return;
    }

    // Show confirmation dialog if nodes have connections or multiple items selected
    if (hasConnections || selectedNodes.length > 1) {
      setDeleteConfirmation({
        show: true,
        nodeCount: selectedNodes.length,
        edgeCount: selectedEdges.length,
        hasConnections,
      });
      return;
    }

    // Direct delete for single node without connections
    performDelete();
  }, [getSelectedNodesInfo]);

  // Perform the actual deletion
  const performDelete = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);

    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));

    toast.success(`Deleted ${selectedNodes.length} node(s) and ${selectedEdges.length} edge(s)`);
    setDeleteConfirmation(null);
  }, [nodes, edges, setNodes, setEdges]);

  // Copy selected nodes
  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdges = edges.filter(
      (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
    );

    if (selectedNodes.length === 0) {
      toast.info('No nodes selected');
      return;
    }

    copyToClipboard(selectedNodes, selectedEdges);
    toast.success(`Copied ${selectedNodes.length} node(s)`);
  }, [nodes, edges, copyToClipboard]);

  // Paste nodes
  const handlePaste = useCallback(() => {
    const pasted = pasteFromClipboard();
    if (!pasted) {
      toast.error('Nothing to paste');
      return;
    }

    // Deselect all current nodes
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));

    // Add pasted nodes and edges
    setNodes((nds) => [...nds, ...pasted.nodes]);
    setEdges((eds) => [...eds, ...pasted.edges]);

    toast.success(`Pasted ${pasted.nodes.length} node(s)`);
  }, [pasteFromClipboard, setNodes, setEdges]);

  // Duplicate selected nodes
  const handleDuplicate = useCallback(() => {
    handleCopy();
    setTimeout(() => handlePaste(), 100);
  }, [handleCopy, handlePaste]);

  // Select all nodes
  const handleSelectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
    toast.success('All nodes selected');
  }, [setNodes]);

  // Undo
  const handleUndo = useCallback(() => {
    const state = undo();
    if (state) {
      setNodes(state.nodes);
      setEdges(state.edges);
      toast.success('Undo');
    }
  }, [undo, setNodes, setEdges]);

  // Redo
  const handleRedo = useCallback(() => {
    const state = redo();
    if (state) {
      setNodes(state.nodes);
      setEdges(state.edges);
      toast.success('Redo');
    }
  }, [redo, setNodes, setEdges]);

  // Context Menu Handlers
  const handleNodeContextMenu = useCallback((event: any, node: CanvasNode) => {
    event.preventDefault();
    setContextMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
      type: 'node',
      targetId: node.id,
    });
  }, []);

  const handlePaneContextMenu = useCallback((event: any) => {
    event.preventDefault();
    setContextMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
      type: 'canvas',
    });
  }, []);

  const handleEdgeContextMenu = useCallback((event: any, edge: CanvasEdge) => {
    event.preventDefault();
    setContextMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
      type: 'edge',
      targetId: edge.id,
    });
  }, []);

  // Context menu actions
  const handleContextMenuDelete = useCallback(() => {
    if (!contextMenu?.targetId) return;

    if (contextMenu.type === 'node') {
      setNodes((nds) => nds.filter((n) => n.id !== contextMenu.targetId));
      toast.success('Node deleted');
    } else if (contextMenu.type === 'edge') {
      setEdges((eds) => eds.filter((e) => e.id !== contextMenu.targetId));
      toast.success('Edge deleted');
    }

    setContextMenu(null);
  }, [contextMenu, setNodes, setEdges]);

  const handleContextMenuCopy = useCallback(() => {
    if (!contextMenu?.targetId || contextMenu.type !== 'node') return;

    const node = nodes.find((n) => n.id === contextMenu.targetId);
    if (node) {
      const connectedEdges = edges.filter(
        (e) => e.source === node.id || e.target === node.id
      );
      copyToClipboard([node], connectedEdges);
      toast.success('Node copied');
    }

    setContextMenu(null);
  }, [contextMenu, nodes, edges, copyToClipboard]);

  const handleContextMenuDuplicate = useCallback(() => {
    if (!contextMenu?.targetId || contextMenu.type !== 'node') return;

    const node = nodes.find((n) => n.id === contextMenu.targetId);
    if (node) {
      const newId = `${node.type}-${Date.now()}`;
      const newNode: CanvasNode = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        selected: false,
      };
      setNodes((nds) => [...nds, newNode]);
      toast.success('Node duplicated');
    }

    setContextMenu(null);
  }, [contextMenu, nodes, setNodes]);

  const handleContextMenuDisconnect = useCallback(() => {
    if (!contextMenu?.targetId || contextMenu.type !== 'node') return;

    const connectedEdges = edges.filter(
      (e) => e.source === contextMenu.targetId || e.target === contextMenu.targetId
    );

    if (connectedEdges.length > 0) {
      setEdges((eds) =>
        eds.filter((e) => e.source !== contextMenu.targetId && e.target !== contextMenu.targetId)
      );
      toast.success(`Disconnected ${connectedEdges.length} connection(s)`);
    } else {
      toast.info('Node has no connections');
    }

    setContextMenu(null);
  }, [contextMenu, edges, setEdges]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Keyboard shortcut for search panel (Cmd/Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const metaKey = isMac ? e.metaKey : e.ctrlKey;

      if (metaKey && e.key === 'k') {
        e.preventDefault();
        setIsSearchPanelOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCopy: handleCopy,
    onPaste: handlePaste,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onSelectAll: handleSelectAll,
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

  return (
    <div className="h-full w-full flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Enhanced Toolbar */}
        <div className="border-b bg-card p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <>
              <Button size="sm" variant="ghost" onClick={onBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="h-6 w-px bg-border mx-1" />
            </>
          )}
          {onWorkflowNameChange && (
            <>
              <Input
                value={workflowName || ''}
                onChange={(e) => onWorkflowNameChange(e.target.value)}
                placeholder="Workflow name"
                className="h-8 w-48"
              />
              <div className="h-6 w-px bg-border mx-1" />
            </>
          )}
          <Button size="sm" variant="default" onClick={handleExecute}>
            <Play className="mr-2 h-4 w-4" />
            Run
          </Button>
          <Button size="sm" variant="outline" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleAutoLayout}>
            <Maximize2 className="mr-2 h-4 w-4" />
            Auto Layout
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          <Button size="sm" variant="ghost" onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          <Button size="sm" variant="ghost" onClick={handleCopy} title="Copy (Ctrl+C)">
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handlePaste} disabled={!hasClipboard} title="Paste (Ctrl+V)">
            <Clipboard className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDelete} title="Delete (Del)">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          {nodes.length} nodes • {edges.length} connections
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onNodeContextMenu={handleNodeContextMenu}
          onPaneContextMenu={handlePaneContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          attributionPosition="bottom-left"
          panOnDrag={[1, 2]} // Middle and right mouse button for panning
          selectionOnDrag // Enable box selection with left mouse button + drag
          multiSelectionKeyCode="Shift" // Enable multi-select with Shift key
          deleteKeyCode="Delete" // Delete key removes selected nodes
          selectionMode="partial" // Select nodes that partially intersect with box
          snapToGrid={true} // Enable grid snapping
          snapGrid={[16, 16]} // Snap to 16px grid
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const colors: Record<string, string> = {
                trigger: '#86efac',
                action: '#93c5fd',
                condition: '#fde047',
                loop: '#d8b4fe',
                delay: '#fdba74',
                transform: '#f9a8d4',
              };
              return colors[node.type as string] || '#e5e7eb';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            id={contextMenu.targetId || 'canvas'}
            top={contextMenu.y}
            left={contextMenu.x}
            type={contextMenu.type}
            hasClipboard={hasClipboard}
            onCopy={handleContextMenuCopy}
            onPaste={handlePaste}
            onDelete={handleContextMenuDelete}
            onDuplicate={handleContextMenuDuplicate}
            onDisconnect={handleContextMenuDisconnect}
            onEdit={() => {
              if (contextMenu?.targetId && contextMenu.type === 'node') {
                const node = nodes.find((n) => n.id === contextMenu.targetId);
                if (node) {
                  setSelectedNodeForConfig(node);
                }
              }
              setContextMenu(null);
            }}
            onExecute={() => {
              // TODO: Execute single node
              toast.info('Single node execution coming soon');
              setContextMenu(null);
            }}
            onAddNode={(type) => {
              if (contextMenu) {
                // Add node at context menu position (approximate)
                addNode(type as NodeType, { x: contextMenu.x - 100, y: contextMenu.y - 40 });
              } else {
                addNode(type as NodeType);
              }
              setContextMenu(null);
            }}
            onAddNote={() => {
              if (contextMenu) {
                // Add note at context menu position
                addNode('note' as NodeType, { x: contextMenu.x - 125, y: contextMenu.y - 75 });
              } else {
                addNode('note' as NodeType);
              }
              setContextMenu(null);
            }}
            onSettings={() => {
              if (contextMenu?.targetId && contextMenu.type === 'node') {
                const node = nodes.find((n) => n.id === contextMenu.targetId);
                if (node) {
                  setSelectedNodeForConfig(node);
                }
              }
              setContextMenu(null);
            }}
          />
        )}

        {/* Node Configuration Panel */}
        <NodeConfigPanel
          node={selectedNodeForConfig}
          onUpdate={updateNodeData}
          onClose={() => setSelectedNodeForConfig(null)}
          onExecute={(nodeId) => {
            // TODO: Execute single node
            toast.info(`Executing node: ${nodeId}`);
          }}
        />

        {/* Node Search Panel */}
        <NodeSearchPanel
          isOpen={isSearchPanelOpen}
          onClose={() => setIsSearchPanelOpen(false)}
          onSelectNode={(type) => {
            addNode(type);
          }}
        />

        {/* Execution Panel */}
        <ExecutionPanel
          isOpen={isExecutionPanelOpen}
          onClose={() => setIsExecutionPanelOpen(false)}
          executionResults={executionResults}
          onRerun={handleExecute}
        />

        {/* Node Creator Panel */}
        <NodeCreatorPanel
          isOpen={isNodeCreatorOpen}
          onClose={() => setIsNodeCreatorOpen(false)}
          onSelectNode={(type) => {
            addNode(type);
            setIsNodeCreatorOpen(false);
          }}
        />

        {/* Floating Action Buttons */}
        <FloatingActionButtons
          onAddNode={() => setIsNodeCreatorOpen(true)}
          onSearch={() => setIsSearchPanelOpen(true)}
          onAddSticky={() => addNode('note')}
        />

        {/* Canvas Add Button (when canvas is empty) */}
        {nodes.length === 0 && (
          <CanvasAddButton
            onClick={() => setIsNodeCreatorOpen(true)}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmation?.show} onOpenChange={(open) => !open && setDeleteConfirmation(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirm Deletion
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteConfirmation?.nodeCount === 1
                  ? 'Are you sure you want to delete this node?'
                  : `Are you sure you want to delete ${deleteConfirmation?.nodeCount} nodes?`}
                {deleteConfirmation?.hasConnections && (
                  <span className="block mt-2 text-amber-600 dark:text-amber-400">
                    This will also remove all connected edges.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={performDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {/* Close Main Content */}
      </div>
      {/* Close Outer */}
    </div>
  );
}
