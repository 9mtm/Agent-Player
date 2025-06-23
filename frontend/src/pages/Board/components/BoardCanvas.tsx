import React, { useRef } from 'react';
import BoardNode from './BoardNode';
import BoardEdge from './BoardEdge';
import type { BoardNodeData } from './BoardNode';
import type { Edge } from './edges';

interface BoardCanvasProps {
  nodes: BoardNodeData[];
  edges: Edge[];
  zoom: number;
  draggedId: string | null;
  panX: number;
  panY: number;
  onNodeMouseDown: (e: React.MouseEvent, id: string) => void;
  onPortMouseDown?: (e: React.MouseEvent, nodeId: string, portId: string, portType: 'output' | 'input') => void;
  onPortMouseUp?: (e: React.MouseEvent, nodeId: string, portId: string, portType: 'output' | 'input') => void;
  edgeDraft?: null | { source: string; mouse: { x: number; y: number } };
  onNodeClick?: (e: React.MouseEvent, id: string) => void;
  onEdgeClick?: (e: React.MouseEvent, id: string) => void;
  selectedEdgeIds?: string[];
  selectedNodeIds?: string[];
  onEdgeLabelDoubleClick?: (id: string, currentLabel: string) => void;
  editingEdgeLabel?: string | null;
  edgeLabelDraft?: string;
  setEdgeLabelDraft?: (v: string) => void;
  onEdgeLabelChange?: (id: string, value: string) => void;
  onNodeLabelDoubleClick?: (id: string, currentLabel: string) => void;
  editingNodeLabel?: string | null;
  nodeLabelDraft?: string;
  setNodeLabelDraft?: (v: string) => void;
  onNodeLabelChange?: (id: string, value: string) => void;
  onNodeContextMenu?: (e: React.MouseEvent, id: string) => void;
  onEdgeContextMenu?: (e: React.MouseEvent, id: string) => void;
  onNodeResize?: (id: string, w: number, h: number) => void;
  onSelectionBox?: (startX: number, startY: number, endX: number, endY: number) => void;
  onEdgeDelete?: (id: string) => void;
}

const GRID_SIZE = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-size')) || 40;
const NODE_HEIGHT = 40;
const PORT_SIZE = 16;

const BoardCanvas: React.FC<BoardCanvasProps> = ({ nodes, edges, zoom, draggedId, panX, panY, onNodeMouseDown, onPortMouseDown, onPortMouseUp, edgeDraft, onNodeClick, onEdgeClick, selectedEdgeIds, selectedNodeIds, onEdgeLabelDoubleClick, editingEdgeLabel, edgeLabelDraft, setEdgeLabelDraft, onEdgeLabelChange, onNodeLabelDoubleClick: nodeLabelDoubleClick, editingNodeLabel, nodeLabelDraft, setNodeLabelDraft, onNodeLabelChange, onNodeContextMenu, onEdgeContextMenu, onNodeResize, onSelectionBox, onEdgeDelete }) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardWidth = boardRef.current?.offsetWidth || 0;
  const boardHeight = boardRef.current?.offsetHeight || 0;

  // Helper to get node center (output port)
  const getNodeOutputPort = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return { x: 0, y: 0 };
    return {
      x: (node.x + panX) * zoom + 80 * zoom + PORT_SIZE * zoom / 2,
      y: (node.y + panY) * zoom + (NODE_HEIGHT * zoom) / 2,
    };
  };
  // Helper to get node center (input port)
  const getNodeInputPort = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return { x: 0, y: 0 };
    return {
      x: (node.x + panX) * zoom - PORT_SIZE * zoom / 2,
      y: (node.y + panY) * zoom + (NODE_HEIGHT * zoom) / 2,
    };
  };

  // Calculate group selection bounding box
  let groupBox: { x: number; y: number; w: number; h: number } | null = null;
  if (selectedNodeIds && selectedNodeIds.length > 1) {
    const selNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
    if (selNodes.length > 1) {
      const xs = selNodes.map(n => (n.x + panX) * zoom);
      const ys = selNodes.map(n => (n.y + panY) * zoom);
      const xe = selNodes.map(n => (n.x + panX) * zoom + 80 * zoom);
      const ye = selNodes.map(n => (n.y + panY) * zoom + 40 * zoom);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xe);
      const maxY = Math.max(...ye);
      groupBox = { x: minX - 12, y: minY - 12, w: maxX - minX + 24, h: maxY - minY + 24 };
    }
  }

  // Selection box logic
  const [boxStart, setBoxStart] = React.useState<{x: number, y: number} | null>(null);
  const [boxEnd, setBoxEnd] = React.useState<{x: number, y: number} | null>(null);
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only if clicking on empty space (not on a node)
    if (e.target === boardRef.current && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      setBoxStart({ x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom });
      setBoxEnd(null);
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (boxStart && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      setBoxEnd({ x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom });
    }
  };
  const handleMouseUp = () => {
    if (boxStart && boxEnd && onSelectionBox) {
      onSelectionBox(boxStart.x, boxStart.y, boxEnd.x, boxEnd.y);
    }
    setBoxStart(null);
    setBoxEnd(null);
  };

  return (
    <div
      ref={boardRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--board-bg)',
        border: '1px solid var(--board-border)',
        borderRadius: 0,
        position: 'relative',
        overflow: 'hidden',
        margin: 0,
        boxShadow: 'none',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Grid */}
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }}
      >
        {/* Vertical lines */}
        {Array.from({ length: Math.ceil(boardWidth / (GRID_SIZE * zoom)) }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={i * GRID_SIZE * zoom}
            y1={0}
            x2={i * GRID_SIZE * zoom}
            y2={boardHeight}
            stroke={'var(--board-border)'}
            strokeWidth={1}
          />
        ))}
        {/* Horizontal lines */}
        {Array.from({ length: Math.ceil(boardHeight / (GRID_SIZE * zoom)) }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={0}
            y1={i * GRID_SIZE * zoom}
            x2={boardWidth}
            y2={i * GRID_SIZE * zoom}
            stroke={'var(--board-border)'}
            strokeWidth={1}
          />
        ))}
      </svg>
      {/* Edges */}
      {edges.map(edge => {
        const isEditing = editingEdgeLabel === edge.id;
        return (
          <div key={edge.id} style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} onClick={e => onEdgeClick && onEdgeClick(e, edge.id)} onContextMenu={e => onEdgeContextMenu && onEdgeContextMenu(e, edge.id)}>
            <BoardEdge
              source={getNodeOutputPort(edge.source)}
              target={getNodeInputPort(edge.target)}
              isSelected={selectedEdgeIds?.includes(edge.id)}
              label={isEditing ? undefined : (edge.label || `${edge.source}→${edge.target}`)}
              labelInput={isEditing ? edgeLabelDraft : undefined}
              onLabelDoubleClick={() => onEdgeLabelDoubleClick && onEdgeLabelDoubleClick(edge.id, edge.label || '')}
              onLabelInputChange={v => setEdgeLabelDraft && setEdgeLabelDraft(v)}
              onLabelInputBlur={() => onEdgeLabelChange && onEdgeLabelChange(edge.id, edgeLabelDraft || '')}
              onDelete={onEdgeDelete ? () => onEdgeDelete(edge.id) : undefined}
            />
          </div>
        );
      })}
      {/* Edge draft (temporary line while dragging) */}
      {edgeDraft && (
        <BoardEdge
          key="edge-draft"
          source={getNodeOutputPort(edgeDraft.source)}
          target={edgeDraft.mouse}
        />
      )}
      {/* Nodes */}
      {nodes.map(node => {
        const isEditing = editingNodeLabel === node.id;
        return (
          <div key={node.id} style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} onClick={e => onNodeClick && onNodeClick(e, node.id)} onContextMenu={e => onNodeContextMenu && onNodeContextMenu(e, node.id)}>
            <BoardNode
              node={{ ...node, x: node.x + panX, y: node.y + panY }}
              zoom={zoom}
              draggedId={draggedId}
              onMouseDown={onNodeMouseDown}
              onPortMouseDown={onPortMouseDown}
              onPortMouseUp={onPortMouseUp}
              isSelected={selectedNodeIds?.includes(node.id)}
              isPortActive={edgeDraft?.source === node.id}
              onLabelDoubleClick={() => nodeLabelDoubleClick && nodeLabelDoubleClick(node.id, node.label)}
              labelInput={isEditing ? nodeLabelDraft : undefined}
              onLabelInputChange={v => setNodeLabelDraft && setNodeLabelDraft(v)}
              onLabelInputBlur={() => onNodeLabelChange && onNodeLabelChange(node.id, nodeLabelDraft || '')}
              isEditingLabel={isEditing}
              onResize={node.type === 'note' && onNodeResize ? onNodeResize : undefined}
            />
          </div>
        );
      })}
      {/* Group selection bounding box */}
      {groupBox && (
        <svg width="100%" height="100%" style={{position: 'absolute', left: 0, top: 0, zIndex: 5, pointerEvents: 'none'}}>
          <rect
            x={groupBox.x}
            y={groupBox.y}
            width={groupBox.w}
            height={groupBox.h}
            fill="#1976d211"
            stroke="#1976d2"
            strokeDasharray="6 4"
            strokeWidth={2.5}
            rx={14}
          />
        </svg>
      )}
      {/* Selection box */}
      {(boxStart && boxEnd) && (
        <svg width="100%" height="100%" style={{position: 'absolute', left: 0, top: 0, zIndex: 20, pointerEvents: 'none'}}>
          <rect
            x={Math.min(boxStart.x, boxEnd.x) * zoom}
            y={Math.min(boxStart.y, boxEnd.y) * zoom}
            width={Math.abs(boxEnd.x - boxStart.x) * zoom}
            height={Math.abs(boxEnd.y - boxStart.y) * zoom}
            fill="#1976d211"
            stroke="#1976d2"
            strokeDasharray="6 4"
            strokeWidth={2.5}
            rx={8}
          />
        </svg>
      )}
    </div>
  );
};

export default BoardCanvas;