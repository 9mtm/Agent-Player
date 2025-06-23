import React from 'react';
import {
  BoardCanvas,
  BoardSidebar,
  BoardMinimap,
  BoardContextMenu,
  BoardStartTrigger,
} from './';
import { boardStyle, mainContentStyle } from './utils/styles';
import type { 
  BoardNodeData, 
  Edge, 
  EdgeDraft, 
  SelectionItem, 
  ContextMenu,
  GroupDragOffsets 
} from './types';

interface BoardContentProps {
  // State
  nodes: BoardNodeData[];
  edges: Edge[];
  theme: 'light' | 'dark';
  zoom: number;
  pan: { x: number; y: number };
  sidebarOpen: boolean;
  minimapVisible: boolean;
  showStartTrigger: boolean;
  
  // Interaction state
  draggedId: string | null;
  sidebarDragType: string | null;
  edgeDraft: EdgeDraft | null;
  editingEdgeLabel: string | null;
  edgeLabelDraft: string;
  editingNodeLabel: string | null;
  nodeLabelDraft: string;
  groupDragOffsets: GroupDragOffsets;
  selection: SelectionItem[];
  contextMenu: ContextMenu | null;
  
  // Refs
  boardRef: React.RefObject<HTMLDivElement>;
  
  // Event handlers
  onTriggerSelect: (type: string) => void;
  onSidebarClose: () => void;
  onSidebarDragStart: (type: string) => void;
  onSidebarDragEnd: () => void;
  onSidebarNodeTypeSelect: () => void;
  onBoardMouseDown: (e: React.MouseEvent) => void;
  onBoardMouseMove: (e: React.MouseEvent) => void;
  onBoardMouseUp: () => void;
  onBoardMouseLeave: () => void;
  onBoardDragOver: (e: React.DragEvent) => void;
  onBoardDrop: (e: React.DragEvent) => void;
  onBoardWheel: (e: React.WheelEvent) => void;
  onBoardClick: () => void;
  onBoardContextMenu: (e: React.MouseEvent) => void;
  onNodeMouseDown: (e: React.MouseEvent, id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, portId: string, portType: 'output' | 'input') => void;
  onPortMouseUp: (e: React.MouseEvent, nodeId: string, portId: string, portType: 'output' | 'input') => void;
  onNodeClick: (e: React.MouseEvent, id: string) => void;
  onEdgeClick: (e: React.MouseEvent, id: string) => void;
  onEdgeLabelDoubleClick: (id: string, currentLabel: string) => void;
  onEdgeLabelChange: (id: string, value: string) => void;
  onNodeLabelDoubleClick: (id: string, currentLabel: string) => void;
  onNodeLabelChange: (id: string, value: string) => void;
  onNodeResize: (id: string, w: number, h: number) => void;
  onEdgeDelete: (id: string) => void;
  onContextMenuDelete: () => void;
  onContextMenuClose: () => void;
  onMinimapViewportChange: (p: { x: number; y: number }) => void;
  onMinimapToggleVisible: () => void;
  
  // State setters for labels
  setEdgeLabelDraft: React.Dispatch<React.SetStateAction<string>>;
  setNodeLabelDraft: React.Dispatch<React.SetStateAction<string>>;
}

export const BoardContent: React.FC<BoardContentProps> = ({
  // State
  nodes,
  edges,
  theme,
  zoom,
  pan,
  sidebarOpen,
  minimapVisible,
  showStartTrigger,
  
  // Interaction state
  draggedId,
  sidebarDragType,
  edgeDraft,
  editingEdgeLabel,
  edgeLabelDraft,
  editingNodeLabel,
  nodeLabelDraft,
  groupDragOffsets,
  selection,
  contextMenu,
  
  // Refs
  boardRef,
  
  // Event handlers
  onTriggerSelect,
  onSidebarClose,
  onSidebarDragStart,
  onSidebarDragEnd,
  onSidebarNodeTypeSelect,
  onBoardMouseDown,
  onBoardMouseMove,
  onBoardMouseUp,
  onBoardMouseLeave,
  onBoardDragOver,
  onBoardDrop,
  onBoardWheel,
  onBoardClick,
  onBoardContextMenu,
  onNodeMouseDown,
  onPortMouseDown,
  onPortMouseUp,
  onNodeClick,
  onEdgeClick,
  onEdgeLabelDoubleClick,
  onEdgeLabelChange,
  onNodeLabelDoubleClick,
  onNodeLabelChange,
  onNodeResize,
  onEdgeDelete,
  onContextMenuDelete,
  onContextMenuClose,
  onMinimapViewportChange,
  onMinimapToggleVisible,
  setEdgeLabelDraft,
  setNodeLabelDraft
}) => {
  return (
    <div style={mainContentStyle}>
      {/* Start Trigger */}
      {showStartTrigger && (
        <BoardStartTrigger onSelect={onTriggerSelect} />
      )}

      {/* Main Board Interface */}
      {!showStartTrigger && (
        <>
          {/* Sidebar */}
          <BoardSidebar
            isOpen={sidebarOpen}
            onClose={onSidebarClose}
            onDragStart={onSidebarDragStart}
            onDragEnd={onSidebarDragEnd}
            onNodeTypeSelect={onSidebarNodeTypeSelect}
          />

          {/* Main Board Area */}
          <div
            ref={boardRef}
            style={boardStyle(theme)}
            onMouseDown={onBoardMouseDown}
            onMouseMove={onBoardMouseMove}
            onMouseUp={onBoardMouseUp}
            onMouseLeave={onBoardMouseLeave}
            onDragOver={onBoardDragOver}
            onDrop={onBoardDrop}
            onWheel={onBoardWheel}
            onClick={onBoardClick}
            onContextMenu={onBoardContextMenu}
          >
            {/* Canvas with Nodes and Edges */}
            <BoardCanvas
              nodes={nodes}
              edges={edges}
              zoom={zoom}
              panX={pan.x}
              panY={pan.y}
              draggedId={draggedId}
              onNodeMouseDown={onNodeMouseDown}
              onPortMouseDown={onPortMouseDown}
              onPortMouseUp={onPortMouseUp}
              edgeDraft={edgeDraft}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              selectedEdgeIds={selection.filter(s => s.type === 'edge').map(s => s.id)}
              selectedNodeIds={selection.filter(s => s.type === 'node').map(s => s.id)}
              onEdgeLabelDoubleClick={onEdgeLabelDoubleClick}
              editingEdgeLabel={editingEdgeLabel}
              edgeLabelDraft={edgeLabelDraft}
              setEdgeLabelDraft={setEdgeLabelDraft}
              onEdgeLabelChange={onEdgeLabelChange}
              onNodeLabelDoubleClick={onNodeLabelDoubleClick}
              editingNodeLabel={editingNodeLabel}
              nodeLabelDraft={nodeLabelDraft}
              setNodeLabelDraft={setNodeLabelDraft}
              onNodeLabelChange={onNodeLabelChange}
              onNodeResize={onNodeResize}
              onSelectionBox={() => {}}
              onEdgeDelete={onEdgeDelete}
            />

            {/* Minimap */}
            {minimapVisible && (
              <BoardMinimap
                nodes={nodes}
                edges={edges}
                zoom={zoom}
                pan={pan}
                boardWidth={boardRef.current?.offsetWidth || 1200}
                boardHeight={boardRef.current?.offsetHeight || 800}
                visible={minimapVisible}
                onViewportChange={onMinimapViewportChange}
                onToggleVisible={onMinimapToggleVisible}
              />
            )}

            {/* Context Menu */}
            <BoardContextMenu 
              contextMenu={contextMenu} 
              onDelete={onContextMenuDelete} 
              onClose={onContextMenuClose} 
            />
          </div>
        </>
      )}
    </div>
  );
}; 