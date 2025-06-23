import React from 'react';
import {
  quickActionsStyle,
  addButtonStyle,
  toolbarSeparatorStyle,
  toolbarButtonStyle
} from '../utils/styles';
import type { QuickActionsProps } from '../types';

export const QuickActions: React.FC<QuickActionsProps> = ({
  selectedAgent,
  boardRef
}) => {
  if (!selectedAgent) return null;

  const handleUndo = () => {
    boardRef.current?.handleUndo();
  };

  const handleRedo = () => {
    boardRef.current?.handleRedo();
  };

  const handleZoomIn = () => {
    boardRef.current?.handleZoomIn();
  };

  const handleZoomOut = () => {
    boardRef.current?.handleZoomOut();
  };

  const handleFitToScreen = () => {
    boardRef.current?.handleFitToScreen();
  };

  return (
    <div style={quickActionsStyle}>
      {/* Add Components Button */}
      <button 
        style={addButtonStyle}
        title="Add Components (HTTP, AI, etc.)"
      >
        + Add
      </button>
      
      {/* Separator */}
      <div style={toolbarSeparatorStyle} />
      
      {/* Undo/Redo */}
      <button 
        style={toolbarButtonStyle}
        onClick={handleUndo}
        title="Undo (Ctrl+Z)"
      >
        ↶
      </button>
      <button 
        style={toolbarButtonStyle}
        onClick={handleRedo}
        title="Redo (Ctrl+Y)"
      >
        ↷
      </button>
      
      {/* Zoom Controls */}
      <button 
        style={toolbarButtonStyle}
        onClick={handleZoomIn}
        title="Zoom In"
      >
        +
      </button>
      <button 
        style={toolbarButtonStyle}
        onClick={handleZoomOut}
        title="Zoom Out"
      >
        -
      </button>
      <button 
        style={toolbarButtonStyle}
        onClick={handleFitToScreen}
        title="Fit to Screen"
      >
        ⤢
      </button>
    </div>
  );
}; 