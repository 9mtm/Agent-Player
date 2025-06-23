import React from 'react';

const WorkflowBoardToolbar: React.FC<{
  onAddNode?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onExport?: () => void;
  onImport?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onThemeToggle?: () => void;
  theme: 'light' | 'dark';
  canUndo: boolean;
  canRedo: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onFitToScreen?: () => void;
}> = ({
  onAddNode,
  onUndo,
  onRedo,
  onExport,
  onImport,
  onThemeToggle,
  theme,
  canUndo,
  canRedo,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start'}}>
    <button onClick={onAddNode} style={{
      borderRadius: 7,
      width: 38,
      height: 38,
      fontSize: 28,
      fontWeight: 700,
      color: '#1976d2',
      background: '#f5f5f5',
      border: '1.5px solid #bbb',
      boxShadow: '0 2px 8px #1976d211',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.13s, border 0.13s',
    }}
      title="Add node"
      aria-label="Add node"
      tabIndex={0}
    >+</button>
    <button onClick={onUndo} disabled={!canUndo} style={{padding: '0.3rem 1.1rem', borderRadius: 7, border: 'none', background: '#f5f5f5', color: '#1976d2', fontWeight: 700, fontSize: 15, cursor: canUndo ? 'pointer' : 'not-allowed', opacity: canUndo ? 1 : 0.5}}
      title="Undo (Ctrl+Z)"
      aria-label="Undo"
      tabIndex={0}
    >⟲ Undo</button>
    <button onClick={onRedo} disabled={!canRedo} style={{padding: '0.3rem 1.1rem', borderRadius: 7, border: 'none', background: '#f5f5f5', color: '#1976d2', fontWeight: 700, fontSize: 15, cursor: canRedo ? 'pointer' : 'not-allowed', opacity: canRedo ? 1 : 0.5}}
      title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
      aria-label="Redo"
      tabIndex={0}
    >Redo ⟳</button>
    <button onClick={onExport} style={{padding: '0.3rem 1.1rem', borderRadius: 7, border: 'none', background: '#f5f5f5', color: '#1976d2', fontWeight: 700, fontSize: 15, cursor: 'pointer'}} 
      title="Export board as JSON"
      aria-label="Export board"
      tabIndex={0}
    >Export</button>
    <label style={{padding: '0.3rem 1.1rem', borderRadius: 7, border: 'none', background: '#f5f5f5', color: '#1976d2', fontWeight: 700, fontSize: 15, cursor: 'pointer'}}
      title="Import board from JSON"
      aria-label="Import board"
      tabIndex={0}
    >
      Import
      <input type="file" accept="application/json" style={{display: 'none'}} onChange={onImport} />
    </label>
    <button onClick={onThemeToggle} style={{padding: '0.3rem 1.1rem', borderRadius: 7, border: '1.5px solid #bbb', background: 'var(--board-bg)', color: 'var(--board-fg)', fontWeight: 600, fontSize: 15, cursor: 'pointer'}} 
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      tabIndex={0}
    >
      {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
    </button>
    <button onClick={onFitToScreen} style={{padding: 8, borderRadius: 7, border: 'none', background: '#f5f5f5', color: '#1976d2', fontWeight: 700, fontSize: 18, cursor: 'pointer'}} 
      title="Fit board to screen"
      aria-label="Fit to screen"
      tabIndex={0}
    >▣</button>
    <button onClick={onZoomIn} style={{padding: 8, borderRadius: 7, border: 'none', background: '#f5f5f5', color: '#1976d2', fontWeight: 700, fontSize: 18, cursor: 'pointer'}} 
      title="Zoom in"
      aria-label="Zoom in"
      tabIndex={0}
    >🔍+</button>
    <button onClick={onZoomOut} style={{padding: 8, borderRadius: 7, border: 'none', background: '#f5f5f5', color: '#1976d2', fontWeight: 700, fontSize: 18, cursor: 'pointer'}} 
      title="Zoom out"
      aria-label="Zoom out"
      tabIndex={0}
    >🔍-</button>
    <button onClick={onResetZoom} style={{padding: 8, borderRadius: 7, border: 'none', background: '#f5f5f5', color: '#1976d2', fontWeight: 700, fontSize: 18, cursor: 'pointer'}} 
      title="Reset zoom and pan"
      aria-label="Reset zoom and pan"
      tabIndex={0}
    >⟲</button>
  </div>
);

export default WorkflowBoardToolbar; 