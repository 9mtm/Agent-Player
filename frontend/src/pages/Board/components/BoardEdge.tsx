import React, { useState, useRef } from 'react';

interface Point {
  x: number;
  y: number;
}

interface BoardEdgeProps {
  source: Point;
  target: Point;
  isSelected?: boolean;
  label?: string;
  labelInput?: string;
  onLabelDoubleClick?: () => void;
  onLabelInputChange?: (v: string) => void;
  onLabelInputBlur?: () => void;
  onDelete?: () => void;
}

function getBezierPath(source: Point, target: Point) {
  const dx = Math.abs(target.x - source.x);
  const c1 = { x: source.x + dx * 0.5, y: source.y };
  const c2 = { x: target.x - dx * 0.5, y: target.y };
  return `M ${source.x},${source.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${target.x},${target.y}`;
}

function getBezierMidpoint(source: Point, target: Point) {
  // Approximate midpoint intersection of curve (t=0.5)
  const dx = Math.abs(target.x - source.x);
  const c1 = { x: source.x + dx * 0.5, y: source.y };
  const c2 = { x: target.x - dx * 0.5, y: target.y };
  // Bezier formula at t=0.5
  const t = 0.5;
  const x = Math.pow(1-t,3)*source.x + 3*Math.pow(1-t,2)*t*c1.x + 3*(1-t)*t*t*c2.x + Math.pow(t,3)*target.x;
  const y = Math.pow(1-t,3)*source.y + 3*Math.pow(1-t,2)*t*c1.y + 3*(1-t)*t*t*c2.y + Math.pow(t,3)*target.y;
  return { x, y };
}

// EdgeToolbar component
const EdgeToolbar: React.FC<{ onDelete: () => void; x: number; y: number }> = ({ onDelete, x, y }) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  return (
    <div
      role="toolbar"
      aria-label="Edge actions"
      style={{
        position: 'absolute',
        left: x - 18,
        top: y - 38,
        display: 'flex',
        gap: 4,
        background: '#fff',
        border: '1.5px solid #bbb',
        borderRadius: 6,
        boxShadow: '0 2px 8px #0002',
        padding: '4px 8px',
        zIndex: 30,
        opacity: 0.97,
      }}
      tabIndex={-1}
      onKeyDown={e => {
        if (e.key === 'Escape') { (document.activeElement as HTMLElement)?.blur(); }
        if (e.key === 'Enter' || e.key === ' ') { onDelete(); }
      }}
    >
      <button
        ref={btnRef}
        onClick={onDelete}
        title="Delete edge"
        aria-label="Delete edge"
        tabIndex={0}
        style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', borderRadius: 4, padding: '2px 8px', color: '#d32f2f', fontWeight: 700, outline: 'none', transition: 'background 0.13s' }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onDelete(); }}
      >🗑️</button>
    </div>
  );
};

const BoardEdge: React.FC<BoardEdgeProps> = ({ source, target, isSelected, label, labelInput, onLabelDoubleClick, onLabelInputChange, onLabelInputBlur, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  const mid = getBezierMidpoint(source, target);
  return (
    <svg
      style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 1 }}
      width="100%" height="100%"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <path
        d={getBezierPath(source, target)}
        fill="none"
        stroke={isSelected ? 'var(--edge-selected)' : 'var(--edge-color)'}
        strokeWidth={isSelected ? 5 : 3}
        markerEnd="url(#arrowhead)"
        style={isSelected ? { filter: 'drop-shadow(0 0 6px #ff980088)' } : {}}
        aria-label={label ? `Edge: ${label}` : `Edge from ${source.x},${source.y} to ${target.x},${target.y}`}
        tabIndex={0}
      >
        <title>{label || 'Edge'}</title>
      </path>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
          <polygon points="0 0, 8 4, 0 8" fill={isSelected ? 'var(--edge-selected)' : 'var(--edge-color)'} />
        </marker>
      </defs>
      {/* EdgeToolbar: show on hover or selection */}
      {(hovered || isSelected) && onDelete && (
        <foreignObject x={mid.x - 18} y={mid.y - 38} width="36" height="36" style={{overflow: 'visible', pointerEvents: 'auto'}}>
          <EdgeToolbar onDelete={onDelete} x={18} y={38} />
        </foreignObject>
      )}
      {labelInput && mid ? (
        <foreignObject x={mid.x - 40} y={mid.y - 16} width="80" height="32" style={{overflow: 'visible'}}>
          <input
            type="text"
            value={labelInput}
            autoFocus
            onChange={e => onLabelInputChange && onLabelInputChange(e.target.value)}
            onBlur={onLabelInputBlur}
            onKeyDown={e => { if (e.key === 'Enter') { if (onLabelInputBlur) { onLabelInputBlur(); } } }}
            style={{
              width: '100%',
              fontSize: 13,
              border: '1.5px solid var(--edge-color)',
              borderRadius: 6,
              padding: '2px 8px',
              background: 'var(--board-panel)',
              color: 'var(--board-fg)',
              fontWeight: 500,
              boxShadow: '0 1px 4px #0001',
              outline: 'none',
              textAlign: 'center',
            }}
            title="Edit edge label"
            aria-label="Edit edge label"
          />
        </foreignObject>
      ) : label && mid ? (
        <foreignObject x={mid.x - 40} y={mid.y - 16} width="80" height="32" style={{overflow: 'visible'}}>
          <div
            style={{
              background: 'var(--board-panel)',
              border: '1px solid var(--board-border)',
              borderRadius: 6,
              padding: '2px 10px',
              fontSize: 13,
              color: 'var(--board-fg)',
              fontWeight: 500,
              boxShadow: '0 1px 4px #0001',
              textAlign: 'center',
              pointerEvents: 'auto',
              minWidth: 30,
              maxWidth: 80,
              whiteSpace: 'nowrap',
              opacity: 0.95,
              cursor: 'pointer',
            }}
            onDoubleClick={onLabelDoubleClick}
            title={label}
            aria-label={`Edge label: ${label}`}
            tabIndex={0}
          >{label}</div>
        </foreignObject>
      ) : null}
    </svg>
  );
};

export default BoardEdge; 