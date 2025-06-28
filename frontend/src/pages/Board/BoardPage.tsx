import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import WorkflowBoard, { type WorkflowBoardHandle, type ConnectionType } from './components/WorkflowBoard';
import { AnimatedToolbar } from './components/AnimatedToolbar';
import { LogPanel } from './components/LogPanel';
import ModernHelpDialog from './components/ModernHelpDialog';
import { ComponentLibrary } from './components/ComponentLibrary';
import { EnhancedBoardSettings } from './components/EnhancedBoardSettings';
import { ChildAgentChatPanel } from './components/ChildAgentChatPanel';

// Interface for Child Agent (matching ChildAgentChatPanel)
interface ChildAgent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'busy';
  avatar?: string;
  capabilities: string[];
  memory_summary?: string;
}
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
  
  // Remove infinite render log - only log once on mount
  
  // Fix infinite render: Use useState with lazy initialization instead of useMemo with Date.now()
  const [boardId] = useState(() => {
    const timestamp = Date.now().toString().slice(-6);
    return agentId ? `BOARD-${agentId}-${timestamp}` : `BOARD-${timestamp}`;
  });
  
  const [initialBoardName] = useState(() => {
    return localStorage.getItem('currentBoardName') || 
           (agentId ? `Agent ${agentId} Board` : 'Training Workflow Board');
  });

  // State declarations
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [boardName, setBoardName] = useState(initialBoardName);
  const [showComponentLibrary, setShowComponentLibrary] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // Initialize with default agent for immediate chat functionality
  const [selectedAgent, setSelectedAgent] = useState<ChildAgent | undefined>(() => ({
    id: `board-assistant-${agentId || 'default'}`,
    name: agentId ? `Agent ${agentId} Assistant` : 'Board Assistant',
    type: 'workflow',
    status: 'active',
    capabilities: ['workflow_design', 'board_management', 'automation', 'real_time_help'],
    memory_summary: agentId 
      ? `I'm your dedicated assistant for Agent ${agentId}'s training board. I can help you build effective training workflows, optimize performance, and manage the learning process.`
      : `I'm your board assistant. I can help you design workflows, add components, optimize performance, and provide real-time guidance for your project.`
  }));
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [logHeight, setLogHeight] = useState(400);
  const [liveMode, setLiveMode] = useState(true);
  const [connectionType, setConnectionType] = useState<ConnectionType>('curved');
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  
  // Refs
  const isInitializedRef = useRef(false);
  const workflowBoardRef = useRef<WorkflowBoardHandle>(null);

  // Queue data state
  const [queueData, setQueueData] = useState<QueueData>({
    queueItems: [],
    currentProcessingIndex: 0,
    isSequentialMode: true
  });

  // Stable functions
  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...entry,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    setLogs(prev => [newLog, ...prev].slice(0, 1000));
  }, []);

  // Callback to receive queue updates
  const handleQueueUpdate = (newQueueData: QueueData) => {
    setQueueData(newQueueData);
  };

  // Keyboard shortcuts management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setShowChat(prev => !prev);
      } else if (e.ctrlKey && e.key === '?') {
        e.preventDefault();
        setShowHelpDialog(true);
      } else if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        setShowMinimap(prev => !prev);
      } else if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        setShowLog(prev => !prev);
      } else if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowComponentLibrary(prev => !prev);
      } else if (e.key === 'c' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setConnectionType(prevType => {
          const types: ConnectionType[] = ['curved', 'straight', 'stepped'];
          const currentIndex = types.indexOf(prevType);
          const nextType = types[(currentIndex + 1) % types.length];
          workflowBoardRef.current?.setConnectionType(nextType);
          return nextType;
        });
      } else if (e.key === 'Escape') {
        setShowHelpDialog(false);
        setShowSettings(false);
        setShowChat(false);
        setShowLog(false);
        setShowComponentLibrary(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty dependency array to prevent re-creating listeners

  // Handlers with debouncing
  const lastToggleTime = useRef(0);
  const handleToggleComponentLibrary = useCallback(() => {
    // Throttle rapid toggles (minimum 300ms between toggles)
    const now = Date.now();
    if (now - lastToggleTime.current < 300) {
      console.log(`🚫 Throttled component library toggle (too rapid)`);
      return;
    }
    lastToggleTime.current = now;
    
    console.log(`🎯 Toggling component library - Current:`, showComponentLibrary, `→ New:`, !showComponentLibrary);
    setShowComponentLibrary(prev => {
      const newValue = !prev;
      console.log(`📋 Component library state updated:`, newValue);
      return newValue;
    });
  }, [showComponentLibrary]);

  // Connection type handler
  const handleConnectionTypeChange = (type: ConnectionType) => {
    setConnectionType(type);
  };

  // Log management functions
  const clearLogs = () => {
    setLogs([]);
  };

  // Initialize board using useLayoutEffect to prevent flashing
  useLayoutEffect(() => {
    const initializeBoard = async () => {
      // Skip if already initialized
      if (isInitializedRef.current) {
        console.log('⚡ Board already initialized, skipping...');
        return;
      }

      try {
        console.log(`🎯 Starting board initialization for agent #${agentId}`);
        
        // Mark as initialized immediately
        isInitializedRef.current = true;

        // Simulate loading for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!agentId) {
          console.log('⚠️ No agent ID provided');
          addLog({
            type: 'info',
            source: 'System',
            message: 'Welcome to the Board! Get started by adding components.',
          });
          
          // Add sample content for empty board
          addLog({
            type: 'info',
            source: 'System',
            message: 'Sample workflow components loaded',
            details: { sampleNodes: 3, sampleConnections: 2 }
          });
        } else {
          addLog({
            type: 'info',
            source: 'Training System',
            message: `Training Board initialized for Agent #${agentId}`,
            details: { boardId, agentId, boardType: 'training' }
          });
          
          addLog({
            type: 'success',
            source: 'Training System',
            message: 'Ready to build AI agent training workflows',
            details: { instructions: 'Use the component library on the left to add workflow elements' }
          });
          
          // Add sample training components
          addLog({
            type: 'info',
            source: 'Training System',
            message: 'Loading sample training workflow...',
            details: { components: ['Input Handler', 'AI Processor', 'Output Generator'] }
          });
          
          setTimeout(() => {
            addLog({
              type: 'success',
              source: 'Training System',
              message: 'Sample training workflow loaded successfully',
              details: { status: 'ready', nextSteps: 'Configure components and test workflow' }
            });
          }, 1500);
        }
      } catch (error) {
        console.error('Error initializing board:', error);
        addLog({
          type: 'error',
          source: 'System',
          message: 'Failed to initialize board',
          details: { error: String(error) }
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeBoard();

    // Cleanup function
    return () => {
      // Silent cleanup - no logging to prevent console spam
    };
  }, [agentId]); // ← SIMPLIFIED: Only depend on agentId

  // Handle WebSocket connection error gracefully
  useEffect(() => {
    const handleWebSocketError = (event: ErrorEvent) => {
      if (event.message.includes('WebSocket')) {
        console.log('💡 WebSocket connection failed - continuing in offline mode');
        addLog({
          type: 'warning',
          source: 'System',
          message: 'WebSocket connection failed - continuing in offline mode',
          details: { feature: 'real-time updates disabled' }
        });
      }
    };

    window.addEventListener('error', handleWebSocketError);
    return () => window.removeEventListener('error', handleWebSocketError);
  }, [addLog]);

  // Save board name to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('currentBoardName', boardName);
  }, [boardName]);

  // Add board info to logs on initialization
  useEffect(() => {
    if (!isLoading) {
      addLog({
        type: 'info',
        source: 'System',
        message: `Board Information`,
        details: { 
          boardId: boardId,
          agentId: agentId || 'None',
          type: agentId ? 'Training Board' : 'Generic Board',
          created: new Date().toISOString()
        }
      });
    }
  }, [isLoading]); // ← SIMPLIFIED: Only depend on isLoading to prevent re-triggering

  // Debug component library state
  useEffect(() => {
    console.log('🔍 Component Library state changed:', {
      showComponentLibrary,
      timestamp: new Date().toISOString()
    });
  }, [showComponentLibrary]);

  // Show loading state
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          fontSize: '24px',
          color: 'white',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          {agentId ? (
            <>
              <div>🎓 Initializing Training Board</div>
              <div style={{ fontSize: '16px', opacity: 0.8, marginTop: '8px' }}>
                Preparing workspace for Agent #{agentId}
              </div>
            </>
          ) : (
            <>
              <div>🎯 Loading Board</div>
              <div style={{ fontSize: '16px', opacity: 0.8, marginTop: '8px' }}>
                Setting up your workspace
              </div>
            </>
          )}
        </div>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          borderTop: '3px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

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
        showLog={showLog}
        onToggleLog={() => setShowLog(!showLog)}
      />

      {/* Main Board Area - Enhanced Drop Zone */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: 'transparent',
        marginLeft: showComponentLibrary ? '350px' : '0px',
        transition: 'margin-left 0.3s ease',
        width: showComponentLibrary ? 'calc(100% - 350px)' : '100%',
        pointerEvents: 'auto', // Ensure drop events reach WorkflowBoard
        zIndex: 1 // Lower z-index than Component Library
      }}>
        <WorkflowBoard
          ref={workflowBoardRef}
          boardId={boardId}
          onToggleLog={() => setShowLog(!showLog)}
          showLog={showLog}
          onToggleHelp={() => setShowHelpDialog(true)}
          liveMode={liveMode}
          onQueueUpdate={handleQueueUpdate}
          onAddLog={addLog}
        />

        {/* Agent Training Board Info - Show when we have an agentId */}
        {agentId && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(102, 126, 234, 0.9)',
            color: 'white',
            padding: '12px 18px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: 1000,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            🎓 Training Board for Agent #{agentId}
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
              Build workflows to train your AI agent
            </div>
          </div>
        )}

        {/* Quick Actions - Load Demo Content */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: showComponentLibrary ? '370px' : '20px',
          display: 'flex',
          gap: '8px',
          zIndex: 1000,
          transition: 'left 0.3s ease'
        }}>
          <button
            onClick={() => {
              workflowBoardRef.current?.loadDemoWorkflow();
              addLog({
                type: 'success',
                source: 'Demo System',
                message: 'Demo workflow loaded successfully',
                details: { nodes: 3, connections: 2, type: 'sample workflow' }
              });
            }}
            style={{
              background: 'rgba(40, 167, 69, 0.9)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
            }}
            title="Load sample workflow components"
          >
            🎯 Load Demo
          </button>
          

        </div>

        {/* Component Library - Fixed Left Sidebar */}
        {showComponentLibrary && (
          <div style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: '350px',
            zIndex: 1500,
            boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            pointerEvents: 'auto' // Allow drag events from library
          }}>
            <ComponentLibrary 
              isOpen={showComponentLibrary}
              onClose={() => {
                console.log('🚫 Closing Component Library');
                setShowComponentLibrary(false);
              }}
              onComponentDrop={(componentData) => {
                console.log('🎯 Component dropped via callback:', componentData);
                // Forward to WorkflowBoard
                if (workflowBoardRef.current) {
                  workflowBoardRef.current.addNodeDirectly(componentData);
                }
              }}
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

        {/* Footer Toolbar - Fixed Position and Visibility */}
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          borderRadius: '25px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
          border: '2px solid rgba(102, 126, 234, 0.3)',
          zIndex: 9999,
          fontSize: '13px',
          color: '#495057',
          minWidth: '400px',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => {
              console.log('🎯 Chat toggle clicked:', !showChat);
              setShowChat(!showChat);
            }}
            style={{
              background: showChat ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(102, 126, 234, 0.1)',
              color: showChat ? 'white' : '#667eea',
              border: showChat ? 'none' : '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '15px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              minWidth: '60px'
            }}
            title="Toggle Chat Panel (Ctrl+/)"
          >
            <i className="fas fa-comments" />
            Chat
          </button>
          
          <button
            onClick={() => {
              console.log('🎯 Log toggle clicked:', !showLog);
              setShowLog(!showLog);
            }}
            style={{
              background: showLog ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(102, 126, 234, 0.1)',
              color: showLog ? 'white' : '#667eea',
              border: showLog ? 'none' : '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '15px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              minWidth: '60px'
            }}
            title="Toggle Log Panel (Ctrl+L)"
          >
            <i className="fas fa-list-alt" />
            Logs
          </button>
          
          <div style={{ width: '2px', height: '25px', background: 'linear-gradient(to bottom, transparent, #667eea, transparent)' }} />
          
          <button
            onClick={() => {
              console.log('🎯 Minimap toggle clicked:', !showMinimap);
              setShowMinimap(!showMinimap);
            }}
            style={{
              background: showMinimap ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(102, 126, 234, 0.1)',
              color: showMinimap ? 'white' : '#667eea',
              border: showMinimap ? 'none' : '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '15px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              minWidth: '50px'
            }}
            title="Toggle Minimap (Ctrl+M)"
          >
            <i className="fas fa-map" />
            Map
          </button>
          
          <button
            onClick={() => {
              console.log('🎯 Component Library toggle clicked:', !showComponentLibrary);
              handleToggleComponentLibrary();
            }}
            style={{
              background: showComponentLibrary ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(102, 126, 234, 0.1)',
              color: showComponentLibrary ? 'white' : '#667eea',
              border: showComponentLibrary ? 'none' : '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '15px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              minWidth: '90px'
            }}
            title="Toggle Component Library (Ctrl+K)"
          >
            <i className="fas fa-cubes" />
            Components
          </button>
          
          <div style={{ width: '2px', height: '25px', background: 'linear-gradient(to bottom, transparent, #667eea, transparent)' }} />
          
          <button
            onClick={() => {
              console.log('🎯 Fit to screen clicked');
              workflowBoardRef.current?.handleFitToScreen();
            }}
            style={{
              background: 'rgba(102, 126, 234, 0.1)',
              color: '#667eea',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '15px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              minWidth: '45px'
            }}
            title="Fit to Screen"
          >
            <i className="fas fa-expand-arrows-alt" />
            Fit
          </button>
        </div>

        {/* Panels - Bottom Layout */}
        {(showLog || showChat) && (
          <div style={{
            position: 'absolute',
            bottom: '60px', // Higher to avoid footer toolbar
            left: 0,
            right: 0,
            height: `${logHeight}px`,
            zIndex: 400,
            display: 'flex',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px 12px 0 0',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            {showChat && (
              <div style={{
                flex: showLog && showChat ? '1 1 50%' : '1',
                borderRight: showLog && showChat ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <ChildAgentChatPanel
                  isOpen={showChat}
                  onClose={() => setShowChat(false)}
                  selectedAgent={selectedAgent}
                  onAgentSelect={(agent) => setSelectedAgent(agent)}
                  boardId={boardId}
                  isBottomPanel={true}
                />
              </div>
            )}
            {showLog && (
              <div style={{
                flex: showLog && showChat ? '1 1 50%' : '1',
                background: 'rgba(26, 26, 26, 0.95)',
                backdropFilter: 'blur(10px)',
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