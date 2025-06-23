import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import WorkflowBoard, { type WorkflowBoardHandle, type ConnectionType } from './components/WorkflowBoard';
import { AnimatedToolbar } from './components/AnimatedToolbar';
import { LogPanel } from './components/LogPanel';
import ModernHelpDialog from './components/ModernHelpDialog';
import { ComponentLibrary } from './components/ComponentLibrary';
import { EnhancedBoardSettings } from './components/EnhancedBoardSettings';
import { ChildAgentChatPanel } from './components/ChildAgentChatPanel';
import './components/boardTheme.css';

interface ChildAgent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'busy';
  capabilities: string[];
  memory_summary?: string;
}

interface QueueData {
  queueItems: QueueItem[];
  currentProcessingIndex: number;
  isSequentialMode: boolean;
}

interface QueueItem {
  id: string;
  serviceType: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  status: 'pending' | 'current' | 'success' | 'error' | 'warning' | 'completed';
  isDisappearing?: boolean;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  source: string;
  target?: string;
  message: string;
  details?: Record<string, unknown>;
}

// Simplified panel system - only bottom layout needed

const BoardPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  
  // Initialize board name from localStorage or use default
  const [boardName, setBoardName] = useState<string>(() => {
    const savedBoardName = localStorage.getItem('currentBoardName');
    if (savedBoardName) {
      console.log('📋 Loaded board name from storage:', savedBoardName);
      return savedBoardName;
    }
    return agentId ? `Agent ${agentId} Board` : 'Training Workflow Board';
  });
  
  // Panel state
  const [showComponentLibrary, setShowComponentLibrary] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<ChildAgent | undefined>();
  
  // Add help dialog state
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  
  // Panel sizing controls
  const [logHeight, setLogHeight] = useState(400);
  
  const [liveMode, setLiveMode] = useState(true);
  const [connectionType, setConnectionType] = useState<ConnectionType>('curved');
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [boardId] = useState(`BOARD-${Date.now().toString().slice(-6)}`);
  const workflowBoardRef = useRef<WorkflowBoardHandle>(null);

  // Add queue data state
  const [queueData, setQueueData] = useState<QueueData>({
    queueItems: [],
    currentProcessingIndex: 0,
    isSequentialMode: true
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Callback to receive queue updates
  const handleQueueUpdate = (newQueueData: QueueData) => {
    setQueueData(newQueueData);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setShowChat(!showChat);
      } else if (e.ctrlKey && e.key === '?') {
        e.preventDefault();
        setShowHelpDialog(true);
      } else if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        setShowMinimap(!showMinimap);
      } else if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        setShowLog(!showLog);
      } else if (e.key === 'c' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const types: ConnectionType[] = ['curved', 'straight', 'stepped'];
        const currentIndex = types.indexOf(connectionType);
        const nextType = types[(currentIndex + 1) % types.length];
        handleConnectionTypeChange(nextType);
      } else if (e.key === 'Escape') {
        setShowHelpDialog(false);
        setShowSettings(false);
        setShowChat(false);
        setShowLog(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showChat, showMinimap, showLog, connectionType]);

  // Handlers
  const handleToggleComponentLibrary = () => setShowComponentLibrary(!showComponentLibrary);
  const handleConnectionTypeChange = (type: ConnectionType) => {
    setConnectionType(type);
    workflowBoardRef.current?.setConnectionType(type);
  };

  // Log management functions
  const addLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...entry,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    setLogs(prev => [newLog, ...prev].slice(0, 1000)); // Keep only last 1000 logs
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Initialize with welcome log
  useEffect(() => {
    addLog({
      type: 'info',
      source: 'System',
      message: 'Board initialized successfully',
      details: { boardId: '158831' }
    });
  }, []);

  // Simplified panel management - no complex layouts needed

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Animated Toolbar */}
      <AnimatedToolbar
        boardName={boardName}
        setBoardName={setBoardName}
        agentId={agentId}
        connectionType={connectionType}
        onConnectionTypeChange={handleConnectionTypeChange}
        onToggleComponentLibrary={handleToggleComponentLibrary}
        onUndo={() => workflowBoardRef.current?.handleUndo()}
        onRedo={() => workflowBoardRef.current?.handleRedo()}
        onZoomOut={() => workflowBoardRef.current?.handleZoomOut()}
        onZoomIn={() => workflowBoardRef.current?.handleZoomIn()}
        onResetZoom={() => workflowBoardRef.current?.handleResetZoom()}
        onFitToScreen={() => workflowBoardRef.current?.handleFitToScreen()}
        onExport={() => workflowBoardRef.current?.handleExport()}
        onImport={(e) => workflowBoardRef.current?.handleImport(e)}
        onToggleSettings={() => setShowSettings(!showSettings)}
        liveMode={liveMode}
        onToggleLiveMode={() => setLiveMode(!liveMode)}
        showChat={showChat}
        onToggleChat={() => setShowChat(!showChat)}
      />

      {/* Main Board Area */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: 'transparent',
      }}>
        <WorkflowBoard
          ref={workflowBoardRef}
          onToggleLog={() => setShowLog(!showLog)}
          showLog={showLog}
          onToggleHelp={() => setShowHelpDialog(true)}
          liveMode={liveMode}
          onQueueUpdate={handleQueueUpdate}
          onAddLog={addLog}
        />

        {/* Component Library - Fixed Left Sidebar */}
        {showComponentLibrary && (
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '350px',
            zIndex: 1000,
            boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)'
          }}>
                         <ComponentLibrary 
               isOpen={showComponentLibrary}
               onClose={() => setShowComponentLibrary(false)}
            />
          </div>
        )}

        {/* Enhanced Board Settings - Real Settings Panel */}
        {showSettings && (
          <EnhancedBoardSettings
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            boardName={boardName}
            setBoardName={setBoardName}
            connectionType={connectionType}
            onConnectionTypeChange={handleConnectionTypeChange}
          />
        )}

        {/* Modern Help Dialog */}
        <ModernHelpDialog
          open={showHelpDialog}
          onClose={() => setShowHelpDialog(false)}
        />

        {/* Panels - Bottom Layout */}
        {(showLog || showChat) && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${logHeight}px`,
            zIndex: 500,
            display: 'flex',
            borderTop: '1px solid #ddd',
            background: '#f8f9fa',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)'
          }}>
            {showChat && (
              <div style={{
                flex: showLog && showChat ? '1 1 50%' : '1',
                borderRight: showLog && showChat ? '1px solid #ddd' : 'none',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <ChildAgentChatPanel
                  isOpen={showChat}
                  onClose={() => setShowChat(false)}
                  selectedAgent={selectedAgent}
                  onAgentSelect={(agent: ChildAgent) => setSelectedAgent(agent)}
                  boardId={boardId}
                  isBottomPanel={true}
                />
              </div>
            )}
            {showLog && (
              <div style={{
                flex: showLog && showChat ? '1 1 50%' : '1',
                background: '#1a1a1a',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <LogPanel
                  isOpen={showLog}
                  onClose={() => setShowLog(false)}
                  height={logHeight}
                  onHeightChange={setLogHeight}
                  logs={logs}
                  onClearLogs={clearLogs}
                  queueItems={queueData.queueItems}
                  currentProcessingIndex={queueData.currentProcessingIndex}
                  isSequentialMode={queueData.isSequentialMode}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardPage;