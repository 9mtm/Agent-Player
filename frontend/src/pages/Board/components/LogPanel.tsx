import React, { useState } from 'react';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  source: string;
  target?: string;
  message: string;
  details?: Record<string, unknown>;
}

interface QueueItem {
  id: string;
  serviceType: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  status: 'pending' | 'current' | 'success' | 'error' | 'warning' | 'completed';
  isDisappearing?: boolean;
}

interface LogPanelProps {
  isOpen: boolean;
  onClose: () => void;
  height: number;
  onHeightChange: (height: number) => void;
  logs: LogEntry[];
  onClearLogs: () => void;
  queueItems?: QueueItem[];
  currentProcessingIndex?: number;
  isSequentialMode?: boolean;
}

export const LogPanel: React.FC<LogPanelProps> = ({
  isOpen,
  onClose,
  height,
  onHeightChange,
  logs,
  onClearLogs,
  queueItems = [],
  currentProcessingIndex = 0,
  isSequentialMode = false
}) => {
  const [activeTab, setActiveTab] = useState<'agent' | 'board' | 'chat' | 'queue'>('board');
  const [logFilter, setLogFilter] = useState<string>('');
  const [logDateFilter, setLogDateFilter] = useState<string>('');

  // Sample log entries - in production will come from backend
  const [systemLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: new Date(),
      type: 'info',
      source: 'WorkflowBoard',
      message: 'Board initialized successfully',
      details: { boardId: 'BOARD-158831' }
    },
    {
      id: '2', 
      timestamp: new Date(Date.now() - 60000),
      type: 'success',
      source: 'AI Agent #1',
      message: 'Processing workflow request',
      details: { status: 'in_progress' }
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 120000),
      type: 'info',
      source: 'ComponentLibrary',
      message: '59 components loaded',
      details: { count: 59 }
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 180000),
      type: 'error',
      source: 'ValidationService',
      message: 'Connection validation failed',
      details: { error: 'Invalid node type' }
    }
  ]);

  // Combine system logs with user logs
  const allLogs = [...logs, ...systemLogs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Filter logs based on active tab and filters
  const filteredLogs = allLogs.filter(log => {
    const matchesTab = activeTab === 'board' ? ['info', 'success'].includes(log.type) :
                     activeTab === 'agent' ? log.type === 'success' :
                     activeTab === 'chat' ? log.type === 'success' : true;
    
    const matchesFilter = !logFilter || 
      log.message.toLowerCase().includes(logFilter.toLowerCase()) ||
      log.source.toLowerCase().includes(logFilter.toLowerCase());
    
    const matchesDate = !logDateFilter || 
      log.timestamp.toISOString().startsWith(logDateFilter);
    
    return matchesTab && matchesFilter && matchesDate;
  });

  // Simple Queue Display - Plain text list like logs
  const renderQueueDisplay = () => {
    if (!isSequentialMode || queueItems.length === 0) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '300px',
          color: '#666',
          fontSize: '16px',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <i className="fas fa-play-circle" style={{ fontSize: '48px', color: '#4ade80' }} />
          <span>No processing active</span>
          <span style={{ fontSize: '14px', color: '#888' }}>Start LIVE or TEST mode to see processing</span>
        </div>
      );
    }

    return (
      <div style={{ padding: "8px" }}>
        <div style={{
          padding: "4px 8px",
          borderBottom: "1px solid #444",
          color: "#ccc",
          fontSize: "12px",
          fontWeight: "600"
        }}>
          Processing Queue ({queueItems.length} items) - {currentProcessingIndex + 1}/{queueItems.length}
        </div>
        
        {queueItems.map((item, index) => {
          const isCurrent = index === currentProcessingIndex;
          const isCompleted = index < currentProcessingIndex;
          const isPending = index > currentProcessingIndex;
          
          let status = 'PENDING';
          let statusColor = '#6c757d';
          
          if (isCurrent) {
            status = 'PROCESSING';
            statusColor = '#4ade80';
          } else if (isCompleted) {
            status = item.status.toUpperCase();
            statusColor = item.status === 'success' ? '#28a745' :
                         item.status === 'warning' ? '#ff9800' :
                         item.status === 'error' ? '#dc3545' : '#28a745';
          }

          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                gap: "12px",
                padding: "4px 8px",
                borderRadius: "4px",
                marginBottom: "2px",
                background: isCurrent ? "#1b2d1b" : 
                           isCompleted ? "#2d1b1b" : "transparent",
                borderLeft: `3px solid ${statusColor}`,
                opacity: isPending ? 0.6 : 1
              }}
            >
              <span style={{ color: "#888", minWidth: "60px", fontSize: "11px" }}>
                {new Date().toLocaleTimeString()}
              </span>
              <span style={{ 
                color: statusColor,
                minWidth: "90px",
                textTransform: "uppercase",
                fontSize: "10px",
                fontWeight: "600"
              }}>
                [{status}]
              </span>
              <span style={{ color: "#fff", minWidth: "120px", fontSize: "12px" }}>
                {item.serviceType}
              </span>
              <span style={{ color: "#ccc", flex: 1, fontSize: "12px" }}>
                Queue position: {index + 1}
                {isCurrent && " - Currently processing..."}
                {isCompleted && " - Completed"}
                {isPending && " - Waiting in queue"}
              </span>
              <span style={{ color: "#666", fontSize: "10px" }}>
                ID: {item.id.slice(-6)}
              </span>
            </div>
          );
        })}
        
        {queueItems.length === 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100px",
            color: "#666",
            fontSize: "14px",
          }}>
            No items in processing queue
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div style={{
      height: `${height}px`,
      background: "#1a1a1a",
      borderTop: "1px solid #333",
      display: "flex",
      flexDirection: "column",
      position: "relative",
    }}>
      {/* Resize Handle */}
      <div
        style={{
          height: "6px",
          background: "linear-gradient(135deg, #667eea, #764ba2)",
          cursor: "ns-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.7,
          transition: "opacity 0.2s",
          borderRadius: "0 0 3px 3px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.7";
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          const startY = e.clientY;
          const startHeight = height;
          
          const handleMouseMove = (moveEvent: MouseEvent) => {
            const newHeight = startHeight - (moveEvent.clientY - startY);
            onHeightChange(Math.max(200, Math.min(600, newHeight)));
          };
          
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
          };
          
          document.body.style.cursor = 'ns-resize';
          document.body.style.userSelect = 'none';
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      >
        <div style={{
          width: "40px",
          height: "3px",
          background: "rgba(255, 255, 255, 0.6)",
          borderRadius: "1.5px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }} />
      </div>

      {/* Header */}
      <div style={{
        height: "40px",
        background: "#2d2d2d",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        borderBottom: "1px solid #444",
      }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "#fff", fontSize: "14px", fontWeight: "600" }}>
            System Logs
          </h3>
          
          {/* Tab Buttons */}
          <div style={{ display: "flex", gap: "4px" }}>
            {([
              { key: 'board' as const, label: 'Board', icon: 'fas fa-project-diagram' },
              { key: 'agent' as const, label: 'Agents', icon: 'fas fa-robot' },
              { key: 'chat' as const, label: 'Chat', icon: 'fas fa-comments' },
              { key: 'queue' as const, label: 'Queue', icon: 'fas fa-tasks' }
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: activeTab === tab.key ? "#4ade80" : "transparent",
                  color: activeTab === tab.key ? "#000" : "#ccc",
                  border: "1px solid #555",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <i className={tab.icon} />
                {tab.label}
                {tab.key === 'queue' && queueItems.length > 0 && (
                  <span style={{
                    background: '#ff5722',
                    color: 'white',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    fontSize: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '2px'
                  }}>
                    {queueItems.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Filters - Only show for log tabs */}
          {activeTab !== 'queue' && (
            <>
              <input
                type="text"
                placeholder="Filter logs..."
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                style={{
                  background: "#1a1a1a",
                  border: "1px solid #555",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  color: "#fff",
                  fontSize: "11px",
                  width: "120px",
                }}
              />
              
              <input
                type="date"
                value={logDateFilter}
                onChange={(e) => setLogDateFilter(e.target.value)}
                style={{
                  background: "#1a1a1a",
                  border: "1px solid #555",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  color: "#fff",
                  fontSize: "11px",
                }}
              />
            </>
          )}

          <button
            onClick={onClearLogs}
            style={{
              background: "#ff9800",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: "11px",
            }}
            title="Clear logs"
          >
            <i className="fas fa-trash" />
          </button>

          <button
            onClick={onClose}
            style={{
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: "11px",
            }}
          >
            <i className="fas fa-times" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: "auto",
        fontFamily: "monospace",
        fontSize: "12px",
      }}>
        {/* Queue Tab Content */}
        {activeTab === 'queue' && renderQueueDisplay()}

        {/* Log Tab Content */}
        {activeTab !== 'queue' && (
          <div style={{ padding: "8px" }}>
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  gap: "12px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  marginBottom: "2px",
                  background: log.type === 'error' ? "#2d1b1b" : 
                             log.type === 'success' ? "#1b2d1b" : 
                             log.type === 'info' ? "#1b1b2d" : "transparent",
                  borderLeft: `3px solid ${
                    log.type === 'error' ? "#dc3545" :
                    log.type === 'success' ? "#28a745" :
                    log.type === 'info' ? "#007bff" : "#6c757d"
                  }`,
                }}
              >
                <span style={{ color: "#888", minWidth: "60px" }}>
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span style={{ 
                  color: log.type === 'error' ? "#ff6b6b" :
                         log.type === 'success' ? "#51cf66" :
                         log.type === 'info' ? "#4dabf7" : "#adb5bd",
                  minWidth: "80px",
                  textTransform: "uppercase",
                  fontSize: "10px",
                  fontWeight: "600"
                }}>
                  [{log.type}]
                </span>
                <span style={{ color: "#fff", minWidth: "100px" }}>
                  {log.source}:
                </span>
                <span style={{ color: "#ccc", flex: 1 }}>
                  {log.message}
                </span>
                {log.details && (
                  <span style={{ color: "#666", fontSize: "10px" }}>
                    {JSON.stringify(log.details)}
                  </span>
                )}
              </div>
            ))}
            
            {filteredLogs.length === 0 && (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100px",
                color: "#666",
                fontSize: "14px",
              }}>
                No logs found matching current filters
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};