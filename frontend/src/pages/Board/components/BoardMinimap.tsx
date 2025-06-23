import React from 'react';
import type { BoardNodeData } from './BoardNode';
import type { Edge } from './edges';

interface BoardMinimapProps {
  nodes: BoardNodeData[];
  edges: Edge[];
  zoom: number;
  pan: { x: number; y: number };
  boardWidth: number;
  boardHeight: number;
  visible: boolean;
  onViewportChange?: (pan: { x: number; y: number }) => void;
  onToggleVisible?: () => void;
}

const MINIMAP_W = 220;
const MINIMAP_H = 140;
const PADDING = 16;

const BoardMinimap: React.FC<BoardMinimapProps> = ({ nodes, edges, zoom, pan, boardWidth, boardHeight, visible, onViewportChange, onToggleVisible }) => {
  if (!visible) return null;

  // Calculate all node bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + 120);
    maxY = Math.max(maxY, n.y + 60);
  });
  if (minX === Infinity) { minX = 0; minY = 0; maxX = 400; maxY = 300; }
  const nodesW = maxX - minX;
  const nodesH = maxY - minY;
  const scale = Math.min((MINIMAP_W - 2 * PADDING) / nodesW, (MINIMAP_H - 2 * PADDING) / nodesH);

  // Calculate node coordinates in minimap
  const mapX = (x: number) => (x - minX) * scale + PADDING;
  const mapY = (y: number) => (y - minY) * scale + PADDING;

  // Calculate viewport rectangle
  const viewW = boardWidth / zoom * scale;
  const viewH = boardHeight / zoom * scale;
  const viewX = mapX(-pan.x);
  const viewY = mapY(-pan.y);

  const handleMinimapDrag = (e: React.MouseEvent | MouseEvent) => {
    const rect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect();
    if (!rect || !onViewportChange) return;
    const mx = (e as MouseEvent).clientX - rect.left;
    const my = (e as MouseEvent).clientY - rect.top;
    // Calculate new pan so the viewport center is at the point
    const centerX = (mx - PADDING) / scale + minX;
    const centerY = (my - PADDING) / scale + minY;
    onViewportChange({
      x: boardWidth / 2 - centerX * zoom,
      y: boardHeight / 2 - centerY * zoom,
    });
  };

  return (
    <div style={{
      position: 'fixed',
      right: 24,
      bottom: 24,
      zIndex: 100,
      background: 'rgba(255,255,255,0.98)',
      border: '2px solid #1976d2',
      borderRadius: 16,
      boxShadow: '0 4px 24px #1976d233',
      padding: 0,
      width: MINIMAP_W,
      height: MINIMAP_H,
      userSelect: 'none',
      transition: 'box-shadow 0.2s',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}
      aria-label="Board minimap"
      tabIndex={0}
    >
      <svg
        width={MINIMAP_W}
        height={MINIMAP_H}
        style={{ display: 'block', borderRadius: 14, background: '#f7fafd', boxShadow: '0 1px 6px #1976d211' }}
        onMouseDown={e => {
          handleMinimapDrag(e);
          const move = (ev: MouseEvent) => handleMinimapDrag(ev);
          const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', move);
          window.addEventListener('mouseup', up);
        }}
        aria-label="Minimap overview"
        tabIndex={0}
      >
        {/* Edges */}
        {edges.map((e, i) => {
          const src = nodes.find(n => n.id === e.source);
          const tgt = nodes.find(n => n.id === e.target);
          if (!src || !tgt) return null;
          return (
            <line
              key={e.id || i}
              x1={mapX(src.x + (src.width || 60) / 2)}
              y1={mapY(src.y + (src.height || 30) / 2)}
              x2={mapX(tgt.x + (tgt.width || 60) / 2)}
              y2={mapY(tgt.y + (tgt.height || 30) / 2)}
              stroke="#90caf9"
              strokeWidth={2}
              opacity={0.7}
              aria-label={`Edge from ${src.label} to ${tgt.label}`}
            />
          );
        })}
        {/* Nodes */}
        {nodes.map((n, i) => (
          <rect
            key={n.id || i}
            x={mapX(n.x)}
            y={mapY(n.y)}
            width={(n.width || 120) * scale}
            height={(n.height || 60) * scale}
            fill="#1976d2"
            stroke="#fff"
            strokeWidth={2}
            rx={7}
            opacity={0.95}
            aria-label={`Node: ${n.label}`}
          />
        ))}
        {/* Viewport rectangle */}
        <rect
          x={viewX}
          y={viewY}
          width={viewW}
          height={viewH}
          fill="none"
          stroke="#ff9800"
          strokeWidth={3}
          strokeDasharray="8 4"
          rx={8}
          style={{ filter: 'drop-shadow(0 0 6px #ff980088)' }}
          aria-label="Current viewport"
        />
      </svg>
      {/* Toggle button */}
      <button
        onClick={onToggleVisible}
        style={{
          position: 'absolute',
          top: -18,
          right: 8,
          background: '#1976d2',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          width: 32,
          height: 32,
          fontSize: 18,
          boxShadow: '0 1px 4px #1976d233',
          cursor: 'pointer',
          zIndex: 101,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s',
        }}
        title="Hide minimap"
        aria-label="Hide minimap"
        tabIndex={0}
      >×</button>
    </div>
  );
};

export default BoardMinimap; 