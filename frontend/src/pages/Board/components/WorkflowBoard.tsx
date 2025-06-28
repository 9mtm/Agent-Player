import React, { useRef, useState, useImperativeHandle, useEffect } from 'react';
import './boardTheme.css';
import { SmartSequentialParticleSystem } from './SmartSequentialParticleSystem';

// Constants
const THEME_KEY = "dpro-board-theme";
const AUTOSAVE_KEY = "dpro-board-autosave";

export type ConnectionType = 'curved' | 'straight' | 'stepped';

export interface WorkflowBoardHandle {
  handleUndo: () => void;
  handleRedo: () => void;
  handleExport: () => void;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleThemeToggle: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleFitToScreen: () => void;
  setConnectionType: (type: ConnectionType) => void;
  getConnectionType: () => ConnectionType;
  loadDemoWorkflow: () => void;
  getQueueDataForParent: () => QueueData | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addNodeDirectly: (componentData: any) => void;
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

interface QueueData {
  queueItems: Array<{
    id: string;
    serviceType: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color: string;
    status: 'pending' | 'current' | 'success' | 'error' | 'warning' | 'completed';
    isDisappearing?: boolean;
  }>;
  currentProcessingIndex: number;
  isSequentialMode: boolean;
}

export interface WorkflowBoardProps {
  boardId: string;
  onToggleLog?: () => void;
  showLog?: boolean;
  onToggleHelp?: () => void;
  liveMode?: boolean;
  onQueueUpdate?: (queueData: QueueData) => void;
  onAddLog?: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
}

interface WorkflowNode {
  id: string;
  x: number;
  y: number;
  label: string;
  type: string;
  color: string;
  icon: string;
}

interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
}

// Create base component with stable props comparison
const BaseWorkflowBoard = React.forwardRef<WorkflowBoardHandle, WorkflowBoardProps>((props, ref) => {
  const {
    boardId,
    onToggleLog,
    showLog,
    onToggleHelp,
    liveMode,
    onQueueUpdate,
    onAddLog
  } = props;

  // Memoize state
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<WorkflowConnection[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [animatedConnections, setAnimatedConnections] = useState<Set<string>>(new Set());
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Enhanced state management
  const [connectionType, setConnectionTypeState] = useState<ConnectionType>('curved');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToastMessage, setShowToastMessage] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });
  const [showMinimap, setShowMinimap] = useState(false);
  const [isSequentialMode, setIsSequentialMode] = useState(true); // Sequential by default
  
  // Queue data for LogPanel
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  
  const boardRef = useRef<HTMLDivElement>(null);

  // Toast utility
  const showToast = (message: string) => {
    setToastMessage(message);
    setShowToastMessage(true);
    setTimeout(() => setShowToastMessage(false), 3000);
  };

  // Handle functions exposed via ref
  const handleUndo = () => showToast('Undo not implemented yet');
  const handleRedo = () => showToast('Redo not implemented yet');
  
  const handleExport = () => {
    const data = JSON.stringify({ nodes, connections, zoom, pan, connectionType }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow-export.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Workflow exported!');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        setNodes(data.nodes || []);
        setConnections(data.connections || []);
        showToast('✅ Workflow imported successfully!');
        console.log('📁 Workflow imported:', data);
      } catch (error) {
        console.error('❌ Import error:', error);
        showToast('❌ Error importing workflow');
      }
    };
    reader.readAsText(file);
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    document.body.classList.toggle('dpro-board-dark', newTheme === 'dark');
    showToast(`Switched to ${newTheme} theme`);
  };

  const handleZoomIn = () => {
    setZoom(z => Math.min(z + 0.1, 3));
    showToast(`Zoom: ${Math.round((zoom + 0.1) * 100)}%`);
  };

  const handleZoomOut = () => {
    setZoom(z => Math.max(z - 0.1, 0.1));
    showToast(`Zoom: ${Math.round((zoom - 0.1) * 100)}%`);
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    showToast('Zoom reset to 100%');
  };

  const handleFitToScreen = () => {
    if (nodes.length === 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      showToast('No nodes to fit');
      return;
    }

    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x + 120));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y + 60));

    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect) return;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const zoomX = (boardRect.width - 100) / contentWidth;
    const zoomY = (boardRect.height - 100) / contentHeight;
    
    const newZoom = Math.min(Math.min(zoomX, zoomY), 1);
    setZoom(newZoom);
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setPan({
      x: (boardRect.width / 2 / newZoom) - centerX,
      y: (boardRect.height / 2 / newZoom) - centerY
    });
    
    showToast('Fit to screen');
  };

  // Connection type handlers
  const setConnectionType = (type: ConnectionType) => {
    setConnectionTypeState(type);
    showToast(`Connection type changed to ${type}`);
  };

  const getConnectionType = () => connectionType;

  // Add handlers for help
  const toggleHelp = () => {
    onToggleHelp?.();
    showToast('Help dialog opened');
  };

  // Clear demo data and load fresh demo
  const loadDemoWorkflow = () => {
    // Clear localStorage
    localStorage.removeItem(AUTOSAVE_KEY);
    
    // Add demo nodes
    const demoNodes: WorkflowNode[] = [
      {
        id: 'demo-start',
        x: 150,
        y: 150,
        label: 'Start Trigger',
        type: 'webhook',
        color: '#8e44ad',
        icon: 'fas fa-play'
      },
      {
        id: 'demo-process',
        x: 350,
        y: 150,
        label: 'AI Process',
        type: 'ai',
        color: '#ff5e57',
        icon: 'fas fa-robot'
      },
      {
        id: 'demo-end',
        x: 550,
        y: 150,
        label: 'Send Email',
        type: 'send-email',
        color: '#43A047',
        icon: 'fas fa-envelope'
      },
      {
        id: 'demo-branch',
        x: 350,
        y: 300,
        label: 'Save to DB',
        type: 'database',
        color: '#2196F3',
        icon: 'fas fa-database'
      }
    ];
    
    const demoConnections: WorkflowConnection[] = [
      {
        id: 'demo-conn-1',
        source: 'demo-start',
        target: 'demo-process'
      },
      {
        id: 'demo-conn-2',
        source: 'demo-process',
        target: 'demo-end'
      },
      {
        id: 'demo-conn-3',
        source: 'demo-process',
        target: 'demo-branch'
      }
    ];
    
    setNodes(demoNodes);
    setConnections(demoConnections);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    showToast('🎯 Demo workflow loaded! Try different connection types in toolbar');
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    handleUndo,
    handleRedo,
    handleExport,
    handleImport,
    handleThemeToggle,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleFitToScreen,
    setConnectionType,
    getConnectionType,
    loadDemoWorkflow,
    getQueueDataForParent: () => queueData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addNodeDirectly: (componentData: any) => {
      console.log('🎯 addNodeDirectly called with:', componentData);
      
      // Create node at center of visible area
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) {
        console.log('❌ Board ref not available for direct add');
        showToast('❌ Board reference error');
        return;
      }

      // Calculate center position
      const centerX = (rect.width / 2 / zoom) - pan.x;
      const centerY = (rect.height / 2 / zoom) - pan.y;

      const newNode: WorkflowNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x: centerX - 60,
        y: centerY - 30,
        label: componentData.label,
        type: componentData.type,
        color: componentData.color,
        icon: componentData.icon
      };

      console.log('🆕 Creating new node via direct add:', newNode);
      
      setNodes(prev => {
        const updated = [...prev, newNode];
        console.log('📊 Nodes array updated via direct add:', updated.length, 'total nodes');
        return updated;
      });
      
      showToast(`✅ Added ${componentData.label} to center!`);
      console.log('✅ Node added successfully via direct method!');
    }
  }), [handleUndo, handleRedo, handleExport, handleImport, handleThemeToggle, handleZoomIn, handleZoomOut, handleResetZoom, handleFitToScreen, setConnectionType, getConnectionType, loadDemoWorkflow, queueData]);

  // Auto-save
  useEffect(() => {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ nodes, connections, zoom, pan, connectionType }));
  }, [nodes, connections, zoom, pan, connectionType]);

  // Enhanced load saved data with persistent node positions
  useEffect(() => {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.nodes && data.nodes.length > 0) {
          console.log('📋 Restoring saved workflow with node positions...');
          setNodes(data.nodes);
          if (data.connections) setConnections(data.connections);
          if (typeof data.zoom === 'number') setZoom(data.zoom);
          if (data.pan) setPan(data.pan);
          if (data.connectionType) setConnectionTypeState(data.connectionType);
          showToast(`✅ Workflow restored! Last saved: ${data.lastSaved ? new Date(data.lastSaved).toLocaleTimeString() : 'Unknown'}`);
          return;
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
        showToast('⚠️ Could not restore saved workflow');
      }
    }
    
    // Load demo only if no saved data
    const demoNodes: WorkflowNode[] = [
      {
        id: 'demo-start',
        x: 200,
        y: 200,
        label: 'Start',
        type: 'webhook',
        color: '#8e44ad',
        icon: 'fas fa-play'
      },
      {
        id: 'demo-process',
        x: 400,
        y: 200,
        label: 'Process Data',
        type: 'ai',
        color: '#ff5e57',
        icon: 'fas fa-robot'
      },
      {
        id: 'demo-end',
        x: 600,
        y: 200,
        label: 'Send Email',
        type: 'send-email',
        color: '#43A047',
        icon: 'fas fa-envelope'
      }
    ];
    
    const demoConnections: WorkflowConnection[] = [
      {
        id: 'demo-conn-1',
        source: 'demo-start',
        target: 'demo-process'
      },
      {
        id: 'demo-conn-2',
        source: 'demo-process',
        target: 'demo-end'
      }
    ];
    
    setNodes(demoNodes);
    setConnections(demoConnections);
    showToast('🎯 Demo workflow loaded! Your changes will be auto-saved');
  }, []);

  // Handle drag and drop from component library - ENHANCED
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 DROP EVENT RECEIVED!', e);
    console.log('📦 DataTransfer items:', e.dataTransfer.types);
    
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      console.log('📋 Raw data received:', rawData);
      
      if (!rawData) {
        console.log('❌ No data found in drop event');
        showToast('❌ No component data found');
        return;
      }

      const componentData = JSON.parse(rawData);
      console.log('📦 Component data parsed:', componentData);
      
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) {
        console.log('❌ Board ref not available');
        showToast('❌ Board reference error');
        return;
      }

      // Calculate drop position with better accuracy
      const x = ((e.clientX - rect.left) / zoom) - pan.x;
      const y = ((e.clientY - rect.top) / zoom) - pan.y;
      
      console.log('📍 Drop position calculated:', { 
        clientX: e.clientX, 
        clientY: e.clientY, 
        rectLeft: rect.left, 
        rectTop: rect.top, 
        zoom, 
        pan, 
        finalX: x, 
        finalY: y 
      });

      const newNode: WorkflowNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x: Math.max(50, x - 60),
        y: Math.max(50, y - 30),
        label: componentData.label,
        type: componentData.type,
        color: componentData.color,
        icon: componentData.icon
      };

      console.log('🆕 Creating new node:', newNode);
      
      setNodes(prev => {
        const updated = [...prev, newNode];
        console.log('📊 Nodes array updated:', updated.length, 'total nodes');
        console.log('📊 New nodes list:', updated.map(n => ({ id: n.id, label: n.label, x: n.x, y: n.y })));
        return updated;
      });
      
      // Success feedback
      showToast(`✅ Added ${componentData.label} to board!`);
      console.log('✅ Node added successfully!');
      
      // Auto-connect logic
      if (nodes.length > 0) {
        console.log('🔗 Checking for auto-connect with', nodes.length, 'existing nodes');
        const nearestNode = nodes.reduce((closest, node) => {
          const distance = Math.sqrt(
            Math.pow(node.x - newNode.x, 2) + Math.pow(node.y - newNode.y, 2)
          );
          console.log(`📏 Distance to ${node.label}:`, distance);
          return distance < 200 && (!closest || distance < closest.distance)
            ? { node, distance }
            : closest;
        }, null as { node: WorkflowNode; distance: number } | null);

        if (nearestNode) {
          console.log('🎯 Found nearest node for auto-connect:', nearestNode);
          const connectionExists = connections.some(
            conn => 
              (conn.source === nearestNode.node.id && conn.target === newNode.id) ||
              (conn.source === newNode.id && conn.target === nearestNode.node.id)
          );

          if (!connectionExists) {
            const newConnection: WorkflowConnection = {
              id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              source: nearestNode.node.id,
              target: newNode.id
            };

            setConnections(prev => [...prev, newConnection]);
            showToast(`🔗 Auto-connected to ${nearestNode.node.label}!`);
            console.log('✅ Auto-connection created:', newConnection);
          } else {
            console.log('⚠️ Connection already exists');
          }
        } else {
          console.log('ℹ️ No nearby nodes for auto-connect');
        }
      } else {
        console.log('ℹ️ First node added to board');
      }
      
    } catch (error) {
      console.error('❌ Drop parsing error:', error);
      showToast('❌ Error adding component');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    
    // Enhanced visual feedback
    const boardElement = boardRef.current;
    if (boardElement) {
      boardElement.style.background = theme === 'dark' 
        ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%), rgba(102, 126, 234, 0.1)' 
        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%), rgba(102, 126, 234, 0.1)';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const boardElement = boardRef.current;
    if (boardElement) {
      boardElement.style.background = theme === 'dark' 
        ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' 
        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
    }
  };

  // Enhanced node movement handlers with better UX
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggedNode(nodeId);
    
    // More accurate drag offset calculation
    const nodeScreenX = node.x * zoom + pan.x * zoom + rect.left;
    const nodeScreenY = node.y * zoom + pan.y * zoom + rect.top;
    
    setDragOffset({
      x: e.clientX - nodeScreenX,
      y: e.clientY - nodeScreenY
    });

    // Select node if not already selected
    if (!selectedNodes.includes(nodeId)) {
      setSelectedNodes([nodeId]);
    }
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
  };

  // Enhanced mouse move with smoother node dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNode && !isPanning) {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return;

      // More precise position calculation
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const x = (mouseX - dragOffset.x) / zoom - pan.x;
      const y = (mouseY - dragOffset.y) / zoom - pan.y;

      // Grid snapping for better alignment (optional)
      const gridSize = 10;
      const snappedX = Math.round(x / gridSize) * gridSize;
      const snappedY = Math.round(y / gridSize) * gridSize;

      setNodes(prev => prev.map(node => 
        node.id === draggedNode 
          ? { 
              ...node, 
              x: Math.max(0, snappedX), 
              y: Math.max(0, snappedY) 
            }
          : node
      ));
    }

    // Handle panning with improved smoothness
    if (isPanning) {
      const deltaX = e.clientX - lastPanPosition.x;
      const deltaY = e.clientY - lastPanPosition.y;
      
      setPan(prev => ({
        x: prev.x + deltaX / zoom,
        y: prev.y + deltaY / zoom
      }));
      
      setLastPanPosition({ x: e.clientX, y: e.clientY });
    }
  };

  // Enhanced mouse up with state cleanup and auto-save
  const handleMouseUp = () => {
    if (draggedNode) {
      console.log('📍 Node position saved for:', draggedNode);
      setDraggedNode(null);
      // Trigger auto-save immediately after drag
      setTimeout(() => {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ 
          nodes, 
          connections, 
          zoom, 
          pan, 
          connectionType,
          lastSaved: new Date().toISOString()
        }));
      }, 100);
    }
    
    if (isPanning) {
      setIsPanning(false);
    }
    
    // Restore text selection
    document.body.style.userSelect = 'auto';
  };

  // Panning handlers
  const handlePanStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if (draggedNode) return; // Don't pan if dragging node
    
    setIsPanning(true);
    setLastPanPosition({ x: e.clientX, y: e.clientY });
  };

  // Connection handlers
  const handleNodeDoubleClick = (nodeId: string) => {
    if (connectingFrom === null) {
      setConnectingFrom(nodeId);
      showToast('Select target node to connect');
    } else if (connectingFrom !== nodeId) {
      // Create connection
      const newConnection: WorkflowConnection = {
        id: `conn-${Date.now()}`,
        source: connectingFrom,
        target: nodeId
      };
      setConnections(prev => [...prev, newConnection]);
      setConnectingFrom(null);
      showToast('Nodes connected!');
    } else {
      setConnectingFrom(null);
      showToast('Connection cancelled');
    }
  };

  // Delete selected nodes
  const handleDeleteNodes = () => {
    if (selectedNodes.length === 0) return;
    
    setNodes(prev => prev.filter(node => !selectedNodes.includes(node.id)));
    setConnections(prev => prev.filter(conn => 
      !selectedNodes.includes(conn.source) && !selectedNodes.includes(conn.target)
    ));
    setSelectedNodes([]);
    showToast(`Deleted ${selectedNodes.length} node(s)`);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteNodes();
      } else if (e.key === 'Escape') {
        setSelectedNodes([]);
        setConnectingFrom(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodes]);

  // Live Mode Animation - Auto animate all connections when live mode is active
  useEffect(() => {
    if (liveMode && connections.length > 0) {
      // Start animating all connections when live mode is enabled
      setAnimatedConnections(new Set(connections.map(c => c.id)));
      showToast('🔴 LIVE Mode: Continuous workflow testing activated!');
    } else if (!liveMode) {
      // Stop all animations when live mode is disabled
      setAnimatedConnections(new Set());
      if (connections.length > 0) {
        showToast('⚫ LIVE Mode: All workflow tests stopped');
      }
    }
  }, [liveMode, connections]);

  // Handle connection click for animation
  const handleConnectionClick = (connectionId: string) => {
    setAnimatedConnections(prev => {
      const newAnimated = new Set(prev);
      if (newAnimated.has(connectionId)) {
        newAnimated.delete(connectionId);
        showToast('🛑 Connection test stopped');
        
        // Log connection stop
        onAddLog?.({
          type: 'info',
          source: 'WorkflowBoard',
          message: `Connection animation stopped`,
          details: { connectionId, action: 'stop' }
        });
      } else {
        newAnimated.add(connectionId);
        showToast('🧪 Connection test started!');
        
        // Log connection start
        onAddLog?.({
          type: 'success',
          source: 'WorkflowBoard',
          message: `Connection animation started`,
          details: { connectionId, action: 'start' }
        });
      }
      return newAnimated;
    });
  };

  // Sequential flow animation from start to end
  const animateSequentialFlow = (startNodeId: string) => {
    const visitedNodes = new Set<string>();
    const animatedConnections = new Set<string>();
    
    const animateFromNode = (nodeId: string, delay: number = 0) => {
      if (visitedNodes.has(nodeId)) return;
      visitedNodes.add(nodeId);
      
      // Find all outgoing connections from this node
      const outgoingConnections = connections.filter(c => c.source === nodeId);
      
      outgoingConnections.forEach((connection, index) => {
        setTimeout(() => {
          animatedConnections.add(connection.id);
          setAnimatedConnections(new Set(animatedConnections));
          
          // Continue to next node after a short delay
          setTimeout(() => {
            animateFromNode(connection.target, 300);
          }, 200);
        }, delay + (index * 150)); // Stagger multiple connections
      });
      
      // If no outgoing connections, this is an end node
      if (outgoingConnections.length === 0) {
        setTimeout(() => {
          showToast('🎯 Test flow completed! Reached end of workflow.');
        }, delay + 500);
      }
    };
    
    // Start the animation flow
    animateFromNode(startNodeId);
  };

  // Enhanced connection path calculation with different types
  const getConnectionPath = (sourceNode: WorkflowNode, targetNode: WorkflowNode): string => {
    const sourceX = sourceNode.x + 120; // Right edge of source
    const sourceY = sourceNode.y + 30; // Middle of source
    const targetX = targetNode.x; // Left edge of target
    const targetY = targetNode.y + 30; // Middle of target

    switch (connectionType) {
      case 'straight': {
        // Direct straight line
        return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
      }
        
      case 'stepped': {
        // Step/orthogonal path
        const midX = sourceX + (targetX - sourceX) / 2;
        return `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
      }
        
      case 'curved':
      default: {
        // Smooth curved Bézier path
        const dx = targetX - sourceX;
        const controlPoint1X = sourceX + Math.max(50, Math.abs(dx) * 0.3);
        const controlPoint2X = targetX - Math.max(50, Math.abs(dx) * 0.3);
        return `M ${sourceX} ${sourceY} C ${controlPoint1X} ${sourceY}, ${controlPoint2X} ${targetY}, ${targetX} ${targetY}`;
      }
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      background: theme === 'dark' 
        ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' 
        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      overflow: 'hidden',
      cursor: isPanning ? 'grabbing' : 'grab'
    }}>
      {/* Toast notification */}
      {showToastMessage && (
        <div style={{
          position: 'fixed',
          top: 80,
          right: 20,
          background: theme === 'dark' ? '#333' : '#fff',
          color: theme === 'dark' ? '#fff' : '#333',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          fontWeight: '500',
          border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
        }}>
          {toastMessage}
        </div>
      )}

      {/* Main workspace */}
      <div
        ref={boardRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: '0 0',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onMouseDown={handlePanStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid background - Enhanced Visibility */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            opacity: 0.8,
            zIndex: 1
          }}
        >
          <defs>
            <pattern
              id="grid"
              width="25"
              height="25"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 25 0 L 0 0 0 25"
                fill="none"
                stroke={theme === 'dark' ? '#555' : '#999'}
                strokeWidth="1.5"
              />
              <circle
                cx="0"
                cy="0"
                r="1"
                fill={theme === 'dark' ? '#666' : '#aaa'}
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Connections */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="12"
              markerHeight="8"
              refX="11"
              refY="4"
              orient="auto"
            >
              <polygon
                points="0 0, 12 4, 0 8"
                fill={theme === 'dark' ? '#667eea' : '#666'}
              />
            </marker>
            <marker
              id="arrowhead-animated"
              markerWidth="12"
              markerHeight="8"
              refX="11"
              refY="4"
              orient="auto"
            >
              <polygon
                points="0 0, 12 4, 0 8"
                fill="#667eea"
              />
            </marker>
            
            {/* Animated gradient for enhanced connections */}
            <linearGradient id="animated-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#667eea" stopOpacity="0.9">
                <animate attributeName="stop-color" 
                  values="#667eea;#764ba2;#667eea" 
                  dur="4s" 
                  repeatCount="indefinite" />
              </stop>
              <stop offset="50%" stopColor="#764ba2" stopOpacity="1">
                <animate attributeName="stop-color" 
                  values="#764ba2;#667eea;#764ba2" 
                  dur="4s" 
                  repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#667eea" stopOpacity="0.9">
                <animate attributeName="stop-color" 
                  values="#667eea;#764ba2;#667eea" 
                  dur="4s" 
                  repeatCount="indefinite" />
              </stop>
            </linearGradient>
            
            {/* Glow filter for enhanced visual effects */}
            <filter id="connection-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feMorphology operator="dilate" radius="1"/>
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <style>
            {`
              @keyframes connectionDashFlow {
                0% { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: -40; }
              }
              
              @keyframes connectionPulse {
                0%, 100% { stroke-width: 2; opacity: 1; }
                50% { stroke-width: 4; opacity: 0.8; }
              }
              
              @keyframes connectionGlow {
                0%, 100% { filter: drop-shadow(0 0 8px rgba(255, 107, 107, 0.6)); }
                50% { filter: drop-shadow(0 0 15px rgba(255, 107, 107, 0.9)); }
              }
              
              @keyframes connectionRainbow {
                0% { stroke: #ff6b6b; }
                16.66% { stroke: #ffa500; }
                33.33% { stroke: #ffff00; }
                50% { stroke: #00ff00; }
                66.66% { stroke: #0080ff; }
                83.33% { stroke: #8000ff; }
                100% { stroke: #ff6b6b; }
              }
              
              .animated-connection {
                stroke: #667eea !important;
                stroke-width: 3;
                filter: drop-shadow(0 0 6px rgba(102, 126, 234, 0.4)) !important;
                transition: all 0.3s ease;
              }
              
              .clickable-connection {
                cursor: pointer;
                stroke-width: 8;
                opacity: 0;
                pointer-events: auto;
                transition: all 0.2s ease;
              }
              
              .clickable-connection:hover {
                opacity: 0.1;
                stroke: #ff6b6b;
              }
              
              .clickable-connection:hover + .connection-path {
                stroke: ${theme === 'dark' ? '#8b94ff' : '#4a5ae8'} !important;
                stroke-width: 3;
                filter: drop-shadow(0 0 6px rgba(102, 126, 234, 0.5));
                transform: scale(1.02);
              }
            `}
          </style>
          
          {connections.map((connection) => {
            const sourceNode = nodes.find(n => n.id === connection.source);
            const targetNode = nodes.find(n => n.id === connection.target);
            
            if (!sourceNode || !targetNode) return null;

            const isAnimated = animatedConnections.has(connection.id);
            const path = getConnectionPath(sourceNode, targetNode);

            return (
              <g key={connection.id}>
                {/* Invisible clickable area */}
                <path
                  className="clickable-connection"
                  d={path}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConnectionClick(connection.id);
                  }}
                  aria-label={`Click to ${isAnimated ? 'stop' : 'test'} ${connectionType} flow! ${isAnimated ? '🛑' : '🧪'}`}
                />
                
                {/* Enhanced Visible connection line */}
                <path
                  className={`connection-path ${isAnimated ? `animated-connection connection-animated ${connectionType}` : ''}`}
                  d={path}
                  stroke={isAnimated ? 'url(#animated-gradient)' : (theme === 'dark' ? '#555' : '#ddd')}
                  strokeWidth={isAnimated ? 4 : 2}
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  style={{
                    filter: isAnimated 
                      ? 'drop-shadow(0 0 12px rgba(102, 126, 234, 0.7))' 
                      : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: 'none',
                    opacity: isAnimated ? 0.9 : 0.6,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round'
                  }}
                />
                
                {/* Energy flow effect for animated connections */}
                {isAnimated && (
                  <path
                    d={path}
                    stroke="rgba(255, 255, 255, 0.8)"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="8 12"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))',
                      pointerEvents: 'none',
                      opacity: 0.7,
                      animation: 'connection-energy-flow 1.5s linear infinite'
                    }}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Smart Sequential Particle System - Intelligent queue management with varied animations */}
        <SmartSequentialParticleSystem
          nodes={nodes}
          connections={connections}
          animatedConnections={animatedConnections}
          isSequentialMode={isSequentialMode}
          connectionType={connectionType}
          onQueueUpdate={(data) => {
            setQueueData(data);
            onQueueUpdate?.(data);
          }}
        />

        {/* Enhanced Nodes with Advanced Effects */}
        {nodes.map((node) => {
          // Determine if this is a start node (no incoming connections)
          const isStartNode = !connections.some(conn => conn.target === node.id);
          // Determine if this is a processing node (has both incoming and outgoing connections)
          const isProcessingNode = connections.some(conn => conn.source === node.id) && 
                                   connections.some(conn => conn.target === node.id);
          // Check if node is currently being animated
          const hasAnimatedConnections = connections.some(conn => 
            (conn.source === node.id || conn.target === node.id) && 
            animatedConnections.has(conn.id)
          );
          
          // Determine node classes for animations
          let nodeClasses = '';
          if (isStartNode && hasAnimatedConnections) {
            nodeClasses = 'node-start';
          } else if (isProcessingNode && hasAnimatedConnections) {
            nodeClasses = 'node-processing';
          }
          
          return (
            <div
              key={node.id}
              className={nodeClasses}
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                width: 120,
                height: 60,
                background: selectedNodes.includes(node.id)
                  ? `linear-gradient(135deg, ${node.color}, ${node.color}dd)`
                  : hasAnimatedConnections
                    ? `linear-gradient(135deg, ${node.color}ee, ${node.color})`
                    : `linear-gradient(135deg, ${node.color}dd, ${node.color})`,
                color: 'white',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 'bold',
                boxShadow: selectedNodes.includes(node.id)
                  ? `0 6px 25px ${node.color}80`
                  : hasAnimatedConnections
                    ? `0 4px 20px ${node.color}60`
                    : '0 2px 8px rgba(0,0,0,0.2)',
                cursor: 'move',
                userSelect: 'none',
                border: selectedNodes.includes(node.id) 
                  ? '3px solid white' 
                  : connectingFrom === node.id
                    ? '3px solid #ffd700'
                    : hasAnimatedConnections
                      ? '2px solid rgba(255,255,255,0.8)'
                      : '2px solid rgba(255,255,255,0.3)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: selectedNodes.includes(node.id) ? 10 : 
                        hasAnimatedConnections ? 5 : 2,
                backdropFilter: hasAnimatedConnections ? 'blur(1px)' : 'none',
                transform: selectedNodes.includes(node.id) 
                  ? 'scale(1.05)' 
                  : hasAnimatedConnections 
                    ? 'scale(1.02)' 
                    : 'scale(1)'
              }}
              title={`${node.label} (${node.type})\nDouble-click to connect\n${isStartNode ? '🚀 Start Node' : isProcessingNode ? '⚙️ Processing Node' : '🎯 End Node'}`}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onDoubleClick={() => handleNodeDoubleClick(node.id)}
              onClick={(e) => {
                e.stopPropagation();
                if (e.ctrlKey || e.metaKey) {
                  // Multi-select
                  setSelectedNodes(prev => 
                    prev.includes(node.id) 
                      ? prev.filter(id => id !== node.id)
                      : [...prev, node.id]
                  );
                } else {
                  setSelectedNodes([node.id]);
                }
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: hasAnimatedConnections ? '18px' : '16px', 
                  marginBottom: '2px',
                  transition: 'font-size 0.3s ease'
                }}>
                  <i className={node.icon}></i>
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  fontWeight: '600',
                  textShadow: hasAnimatedConnections ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}>
                  {node.label}
                </div>
              </div>
            </div>
          );
        })}

        {/* Welcome message when empty */}
        {nodes.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: theme === 'dark' ? '#aaa' : '#666',
            fontSize: '18px',
            fontWeight: '500',
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏗️</div>
            <div>Drag components from the library to start building</div>
            <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.7 }}>
              • Drag nodes from the Components panel<br/>
              • Click to select nodes<br/>
              • Double-click to connect nodes<br/>
              • Use Delete key to remove selected nodes<br/>
              • Choose connection style from toolbar<br/>
              • <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>Click on any connection line to animate it! 🎬</span>
            </div>
          </div>
        )}

        {/* Simple Minimap */}
        {showMinimap && nodes.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '70px',
            right: '20px',
            width: '200px',
            height: '120px',
            background: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
            border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
            borderRadius: '8px',
            padding: '8px',
            backdropFilter: 'blur(10px)',
            zIndex: 100
          }}>
            <div style={{
              fontSize: '10px',
              fontWeight: '600',
              marginBottom: '6px',
              color: theme === 'dark' ? '#fff' : '#333',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Board Overview</span>
              <button
                onClick={() => setShowMinimap(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme === 'dark' ? '#fff' : '#333',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '2px'
                }}
              >
                ×
              </button>
            </div>
            <div style={{
              background: theme === 'dark' ? '#333' : '#f5f5f5',
              height: '80px',
              borderRadius: '4px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Minimap nodes */}
              {nodes.map((node, index) => (
                <div
                  key={node.id}
                  style={{
                    position: 'absolute',
                    left: `${(index * 30) % 150}px`,
                    top: `${Math.floor(index / 5) * 15 + 10}px`,
                    width: '8px',
                    height: '8px',
                    background: node.color,
                    borderRadius: '2px',
                    opacity: selectedNodes.includes(node.id) ? 1 : 0.7
                  }}
                />
              ))}
              {/* Viewport indicator */}
              <div style={{
                position: 'absolute',
                border: '1px solid #667eea',
                background: 'rgba(102, 126, 234, 0.1)',
                width: '30px',
                height: '20px',
                left: '10px',
                top: '10px',
                borderRadius: '2px'
              }} />
            </div>
            <div style={{
              fontSize: '8px',
              color: theme === 'dark' ? '#aaa' : '#666',
              marginTop: '4px',
              textAlign: 'center'
            }}>
              {nodes.length} nodes • {connections.length} connections
            </div>
          </div>
        )}

        {/* Help is now handled by parent ModernHelpDialog */}
      </div>

      {/* Enhanced Status bar with minimap */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50px',
        background: theme === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        color: theme === 'dark' ? '#fff' : '#333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        fontSize: '12px',
        fontWeight: '500',
        borderTop: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
      }}>
        {/* Left Section - Board Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ 
              color: theme === 'dark' ? '#67eea' : '#667eea', 
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'help',
            }}
            title='Board ID - Used for tracking and synchronization'
            >
              <i className="fas fa-fingerprint" style={{ marginRight: '5px' }}></i>
              {boardId.split('-').map((part, index) => (
                <span key={index} style={{
                  backgroundColor: index === 1 ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                  padding: index === 1 ? '2px 4px' : '0',
                  borderRadius: '4px',
                  fontSize: index === 1 ? '12px' : '11px',
                  opacity: index === 2 ? 0.7 : 1
                }}>
                  {part}
                  {index < 2 && '-'}
                </span>
              ))}
            </span>
            <span style={{ color: theme === 'dark' ? '#aaa' : '#666' }}>|</span>
            <span>
              <i className="fas fa-cubes" style={{ marginRight: '5px', color: '#43A047' }}></i>
              Nodes: {nodes.length}
            </span>
            <span>
              <i className="fas fa-link" style={{ marginRight: '5px', color: '#2196F3' }}></i>
              Connections: {connections.length}
            </span>
            {selectedNodes.length > 0 && (
              <span style={{ color: '#ff9800' }}>
                <i className="fas fa-mouse-pointer" style={{ marginRight: '5px' }}></i>
                Selected: {selectedNodes.length}
              </span>
            )}
            {connectingFrom && (
              <span style={{ color: '#ffc107', animation: 'pulse 1s infinite' }}>
                <i className="fas fa-plug" style={{ marginRight: '5px' }}></i>
                Connecting...
              </span>
            )}
          </div>
        </div>

        {/* Center Section - Position & Viewport Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '11px' }}>
          <span>
            <i className="fas fa-search" style={{ marginRight: '4px', color: '#9c27b0' }}></i>
            Zoom: {Math.round(zoom * 100)}%
          </span>
          <span>
            <i className="fas fa-arrows-alt" style={{ marginRight: '4px', color: '#ff5722' }}></i>
            Pan: ({Math.round(pan.x)}, {Math.round(pan.y)})
          </span>
          <span>
            <i className="fas fa-bezier-curve" style={{ marginRight: '4px', color: '#795548' }}></i>
            {connectionType.charAt(0).toUpperCase() + connectionType.slice(1)} Lines
          </span>
          {animatedConnections.size > 0 && (
            <span style={{ color: liveMode ? '#28a745' : '#36a2eb' }}>
              <i className={liveMode ? "fas fa-broadcast-tower" : "fas fa-flask"} style={{ marginRight: '4px' }}></i>
              {liveMode ? `LIVE: ${animatedConnections.size} Active` : `Test: ${animatedConnections.size} Running`}
            </span>
          )}
          
          {liveMode && connections.length > 0 && (
            <span style={{ color: '#28a745', fontWeight: '600', animation: 'pulse 2s infinite' }}>
              <i className="fas fa-circle" style={{ marginRight: '4px', fontSize: '8px' }}></i>
              LIVE BOARD
            </span>
          )}
        </div>

        {/* Right Section - Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Animation Mode Toggle */}
          <button
            onClick={() => {
              setIsSequentialMode(!isSequentialMode);
              showToast(isSequentialMode ? '🔄 Switched to Parallel Mode' : '⚡ Switched to Sequential Mode');
            }}
            style={{
              background: isSequentialMode ? 'rgba(255, 193, 7, 0.1)' : 'rgba(33, 150, 243, 0.1)',
              border: `1px solid ${isSequentialMode ? 'rgba(255, 193, 7, 0.3)' : 'rgba(33, 150, 243, 0.3)'}`,
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '10px',
              color: isSequentialMode ? '#FFC107' : '#2196F3',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title={isSequentialMode ? "Sequential Mode: One particle at a time (LLM-style)" : "Parallel Mode: All particles together"}
          >
            <i className={isSequentialMode ? "fas fa-list-ol" : "fas fa-layer-group"}></i>
            <span>{isSequentialMode ? 'Sequential' : 'Parallel'}</span>
          </button>

          {/* Connection Animation Controls */}
          {connections.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                onClick={() => {
                  if (!liveMode) {
                    // Start sequential flow animation from first to last node
                    setAnimatedConnections(new Set());
                    setTimeout(() => {
                      const startNode = nodes.find(n => 
                        !connections.some(c => c.target === n.id)
                      ) || nodes[0]; // Find starting node or use first
                      
                      if (startNode) {
                        animateSequentialFlow(startNode.id);
                        showToast('🧪 Test flow started from beginning to end!');
                      }
                    }, 100);
                  } else {
                    showToast('🔴 LIVE Mode is active - connections auto-animated!');
                  }
                }}
                style={{
                  background: liveMode ? 'rgba(40, 167, 69, 0.1)' : 'none',
                  border: `1px solid ${liveMode ? 'rgba(40, 167, 69, 0.3)' : 'rgba(54, 162, 235, 0.3)'}`,
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: liveMode ? 'not-allowed' : 'pointer',
                  fontSize: '10px',
                  color: liveMode ? '#28a745' : '#36a2eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: liveMode ? 0.6 : 1,
                }}
                title={liveMode ? "LIVE Mode active - auto-animating" : "Test workflow flow from start to end"}
              >
                <i className={liveMode ? "fas fa-broadcast-tower" : "fas fa-flask"}></i>
                <span>{liveMode ? 'LIVE' : 'Test'}</span>
              </button>
              
              <button
                onClick={() => {
                  if (!liveMode) {
                    setAnimatedConnections(new Set());
                    showToast('🧹 All tests cleared - workflow reset!');
                  } else {
                    showToast('🔴 Turn off LIVE Mode to manually control tests');
                  }
                }}
                style={{
                  background: liveMode ? 'rgba(40, 167, 69, 0.1)' : 'none',
                  border: `1px solid ${liveMode ? 'rgba(40, 167, 69, 0.3)' : 'rgba(234, 67, 53, 0.3)'}`,
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: liveMode ? 'not-allowed' : 'pointer',
                  fontSize: '10px',
                  color: liveMode ? '#28a745' : '#ea4335',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: liveMode ? 0.6 : 1,
                }}
                title={liveMode ? "LIVE Mode active - auto-controlled" : "Clear all test flows"}
              >
                <i className={liveMode ? "fas fa-broadcast-tower" : "fas fa-eraser"}></i>
                <span>{liveMode ? 'AUTO' : 'Clear'}</span>
              </button>
            </div>
          )}
          
          <button
            onClick={() => {
              onToggleLog?.();
            }}
            style={{
              background: showLog ? '#ff5722' : 'none',
              border: '1px solid rgba(255, 87, 34, 0.3)',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '10px',
              color: showLog ? 'white' : '#ff5722',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Toggle Log Panel"
          >
            <i className="fas fa-terminal"></i>
            <span>Log</span>
          </button>
          
          <button
            onClick={() => toggleHelp()}
            style={{
              background: 'none',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '10px',
              color: theme === 'dark' ? '#667eea' : '#667eea',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Keyboard Shortcuts (Ctrl+?)"
          >
            <i className="fas fa-keyboard"></i>
            <span>Help</span>
          </button>
          
          <button
            onClick={() => {
              setShowMinimap(!showMinimap);
              showToast(showMinimap ? 'Minimap hidden' : 'Minimap shown');
            }}
            style={{
              background: showMinimap ? '#4caf50' : 'none',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '10px',
              color: showMinimap ? 'white' : '#4caf50',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Toggle Minimap (Ctrl+M)"
          >
            <i className="fas fa-map"></i>
            <span>Map</span>
          </button>
        </div>
      </div>
    </div>
  );
});

// Add display name
BaseWorkflowBoard.displayName = 'WorkflowBoard';

// Wrap with memo and custom comparison
const WorkflowBoard = React.memo(BaseWorkflowBoard, (prevProps, nextProps) => {
  return (
    prevProps.showLog === nextProps.showLog &&
    prevProps.liveMode === nextProps.liveMode &&
    prevProps.onQueueUpdate === nextProps.onQueueUpdate &&
    prevProps.onAddLog === nextProps.onAddLog
  );
});

// Export memoized component
export default WorkflowBoard; 