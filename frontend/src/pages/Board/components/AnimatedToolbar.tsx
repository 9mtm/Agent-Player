import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ConnectionType } from './WorkflowBoard';

interface AnimatedToolbarProps {
  boardName: string;
  setBoardName: (name: string) => void;
  agentId?: string;
  connectionType: ConnectionType;
  onConnectionTypeChange: (type: ConnectionType) => void;
  onToggleComponentLibrary: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleSettings: () => void;
  liveMode: boolean;
  onToggleLiveMode: () => void;
  showChat: boolean;
  onToggleChat: () => void;
  showLog: boolean;
  onToggleLog: () => void;
}

export const AnimatedToolbar: React.FC<AnimatedToolbarProps> = React.memo(({
  boardName,
  setBoardName,
  agentId,
  connectionType,
  onConnectionTypeChange,
  onToggleComponentLibrary,
  onUndo,
  onRedo,
  onZoomOut,
  onZoomIn,
  onResetZoom,
  onFitToScreen,
  onExport,
  onImport,
  onToggleSettings,
  liveMode,
  onToggleLiveMode,
  showChat,
  onToggleChat,
  showLog,
  onToggleLog,
}) => {
  const navigate = useNavigate();
  const [animatedIcons, setAnimatedIcons] = useState<Set<string>>(new Set());
  const [isEditingBoardName, setIsEditingBoardName] = useState(false);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastClickTimes = useRef<Map<string, number>>(new Map());

  // Animation timers for cleanup
  const animationTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Animation handlers optimized for UI

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(animationTimersRef.current).forEach(timer => clearTimeout(timer));
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  const handleGoBack = () => navigate('/dashboard');

  // Handle icon animation toggle with debouncing
  const toggleIconAnimation = useCallback((iconId: string) => {
    // Throttle rapid clicks (minimum 300ms between clicks for same icon)
    const now = Date.now();
    const lastClick = lastClickTimes.current.get(iconId) || 0;
    if (now - lastClick < 300) {
      console.log(`🚫 Throttled click for: ${iconId} (too rapid)`);
      return;
    }
    lastClickTimes.current.set(iconId, now);

    // Clear any existing timeout for this icon
    const existingTimeout = timeoutRefs.current.get(iconId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutRefs.current.delete(iconId);
    }

    setAnimatedIcons(prev => {
      const newAnimated = new Set(prev);
      if (newAnimated.has(iconId)) {
        console.log(`🛑 Stopping animation for: ${iconId}`);
        newAnimated.delete(iconId);
      } else {
        console.log(`🎯 Starting animation for: ${iconId} (1 second)`);
        newAnimated.add(iconId);
        
        // Set up auto-stop timeout
        const timeout = setTimeout(() => {
          console.log(`⏰ Auto-stopping animation for: ${iconId}`);
          setAnimatedIcons(current => {
            const updated = new Set(current);
            updated.delete(iconId);
            return updated;
          });
          timeoutRefs.current.delete(iconId);
        }, 1000);
        
        timeoutRefs.current.set(iconId, timeout);
      }
      return newAnimated;
    });
  }, []);

  const getConnectionTypeContent = (type: ConnectionType) => {
    switch (type) {
      case 'curved':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="18" height="12" viewBox="0 0 18 12" style={{ fill: 'currentColor' }}>
              <path 
                d="M1 6 Q9 1 17 6" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="none" 
                strokeLinecap="round"
                strokeDasharray="0"
                strokeDashoffset="0"
                style={{ animation: 'none' }}
              />
            </svg>
          </div>
        );
      case 'straight':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="18" height="12" viewBox="0 0 18 12" style={{ fill: 'currentColor' }}>
              <line 
                x1="1" 
                y1="6" 
                x2="17" 
                y2="6" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
                strokeDasharray="0"
                strokeDashoffset="0"
                style={{ animation: 'none' }}
              />
            </svg>
          </div>
        );
      case 'stepped':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="18" height="12" viewBox="0 0 18 12" style={{ fill: 'currentColor' }}>
              <path 
                d="M1 6 L6 6 L6 3 L10 3 L10 8 L17 8" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="none" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                strokeDasharray="0"
                strokeDashoffset="0"
                style={{ animation: 'none' }}
              />
            </svg>
          </div>
        );
      default:
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="18" height="12" viewBox="0 0 18 12" style={{ fill: 'currentColor' }}>
              <path 
                d="M1 6 Q9 1 17 6" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="none" 
                strokeLinecap="round"
                strokeDasharray="0"
                style={{ animation: 'none' }}
              />
            </svg>
          </div>
        );
    }
  };

  return (
    <div style={{
      height: '60px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      gap: '12px',
      zIndex: 100,
    }}>
      {/* Left: Back Button + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleIconAnimation('back-button');
            setTimeout(() => handleGoBack(), 200);
          }}
          style={{
            background: 'rgba(102, 126, 234, 0.1)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#667eea',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <i 
            className="fas fa-arrow-left" 
            style={{
              animation: animatedIcons.has('back-button') ? 'iconBounce 0.6s ease-in-out infinite' : 'none',
              transform: animatedIcons.has('back-button') ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.2s ease'
            }}
          />
          Back
        </button>
        
        {isEditingBoardName ? (
          <input
            type="text"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            onBlur={() => {
              setIsEditingBoardName(false);
              localStorage.setItem('currentBoardName', boardName);
              console.log('💾 Board name saved:', boardName);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditingBoardName(false);
                localStorage.setItem('currentBoardName', boardName);
                console.log('💾 Board name saved:', boardName);
              } else if (e.key === 'Escape') {
                const savedBoardName = localStorage.getItem('currentBoardName');
                if (savedBoardName) {
                  setBoardName(savedBoardName);
                }
                setIsEditingBoardName(false);
              }
            }}
            autoFocus
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '600',
              color: '#495057',
              background: 'white',
              border: '2px solid #667eea',
              borderRadius: '4px',
              padding: '4px 8px',
              outline: 'none',
              minWidth: '200px'
            }}
          />
        ) : (
          <h1 
            onClick={() => setIsEditingBoardName(true)}
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '600',
              color: '#495057',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'background 0.2s',
              border: '2px solid transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            title="Click to edit board name"
          >
            {boardName}
            {agentId && (
              <span style={{
                fontSize: '11px',
                color: '#6c757d',
                fontWeight: '400',
                marginLeft: '6px'
              }}>
                (Agent {agentId})
              </span>
            )}
          </h1>
        )}
      </div>

      {/* Center: Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* History Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleIconAnimation('undo-button');
              setTimeout(() => onUndo(), 200);
            }}
            title="Undo (Ctrl+Z)"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#495057',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#667eea';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.color = '#495057';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
          >
            <i 
              className="fas fa-undo" 
              style={{
                animation: animatedIcons.has('undo-button') ? 'iconSpin 0.8s ease-in-out infinite' : 'none',
                transform: animatedIcons.has('undo-button') ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease'
              }}
            />
            Undo
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleIconAnimation('redo-button');
              setTimeout(() => onRedo(), 200);
            }}
            title="Redo (Ctrl+Y)"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#495057',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#667eea';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.color = '#495057';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
          >
            <i 
              className="fas fa-redo" 
              style={{
                animation: animatedIcons.has('redo-button') ? 'iconSpin 0.8s ease-in-out infinite' : 'none',
                transform: animatedIcons.has('redo-button') ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease'
              }}
            />
            Redo
          </button>
        </div>
        
        <div style={{ width: '2px', height: '24px', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '1px', opacity: 0.3 }} />
        
        {/* Connection Types */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', padding: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '500', paddingLeft: '4px' }}>
            Lines:
          </span>
          {(['curved', 'straight', 'stepped'] as ConnectionType[]).map((type) => (
            <button
              key={type}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleIconAnimation(`connection-${type}`);
                onConnectionTypeChange(type);
              }}
              title={`${type.charAt(0).toUpperCase() + type.slice(1)} connections`}
              style={{
                background: connectionType === type ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
                color: connectionType === type ? 'white' : '#495057',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 8px',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (connectionType !== type) {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (connectionType !== type) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{
                animation: animatedIcons.has(`connection-${type}`) ? 'iconBounce 0.6s ease-in-out infinite' : 'none',
                transform: animatedIcons.has(`connection-${type}`) ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease'
              }}>
                {getConnectionTypeContent(type)}
              </div>
            </button>
          ))}
        </div>
        
        <div style={{ width: '2px', height: '24px', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '1px', opacity: 0.3 }} />
        
        {/* Zoom Controls - Separated Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', padding: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '500', paddingLeft: '4px' }}>
            Zoom:
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleIconAnimation('zoom-out-button');
              setTimeout(() => onZoomOut(), 200);
            }}
            title="Zoom Out"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#495057',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <i 
              className="fas fa-search-minus" 
              style={{
                animation: animatedIcons.has('zoom-out-button') ? 'iconPulse 0.6s ease-in-out infinite' : 'none',
                transform: animatedIcons.has('zoom-out-button') ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease'
              }}
            />
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleIconAnimation('reset-zoom-button');
              setTimeout(() => onResetZoom(), 200);
            }}
            title="Reset Zoom (100%)"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',  
              fontSize: '12px',
              color: '#495057',
              fontWeight: '600',
              minWidth: '42px',
              transition: 'all 0.2s ease',
              animation: animatedIcons.has('reset-zoom-button') ? 'iconShake 0.5s ease-in-out infinite' : 'none',
              transform: animatedIcons.has('reset-zoom-button') ? 'scale(1.1)' : 'scale(1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            100%
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleIconAnimation('zoom-in-button');
              setTimeout(() => onZoomIn(), 200);
            }}
            title="Zoom In"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#495057',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <i 
              className="fas fa-search-plus" 
              style={{
                animation: animatedIcons.has('zoom-in-button') ? 'iconPulse 0.6s ease-in-out infinite' : 'none',
                transform: animatedIcons.has('zoom-in-button') ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease'
              }}
            />
          </button>
          
          <div style={{ width: '1px', height: '16px', background: '#dee2e6', margin: '0 4px' }} />
          
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleIconAnimation('fit-screen-button');
              setTimeout(() => onFitToScreen(), 200);
            }}
            title="Fit to Screen"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#495057',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <i 
              className="fas fa-expand-arrows-alt" 
              style={{
                animation: animatedIcons.has('fit-screen-button') ? 'iconBounce 0.6s ease-in-out infinite' : 'none',
                transform: animatedIcons.has('fit-screen-button') ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease'
              }}
            />
          </button>
        </div>
        
        <div style={{ width: '2px', height: '24px', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '1px', opacity: 0.3 }} />
        
        {/* Import/Export - Separated Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleIconAnimation('export-button');
              setTimeout(() => onExport(), 200);
            }}
            title="Export Workflow"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(40, 167, 69, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#28a745',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#28a745';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(40, 167, 69, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.color = '#28a745';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
          >
            <i 
              className="fas fa-download" 
              style={{
                animation: animatedIcons.has('export-button') ? 'iconBounce 0.6s ease-in-out infinite' : 'none',
                transform: animatedIcons.has('export-button') ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease'
              }}
            />
            Export
          </button>
          
          <label
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(0, 123, 255, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#007bff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#007bff';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.color = '#007bff';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
            onClick={() => {
              toggleIconAnimation('import-button');
            }}
            title="Import Workflow"
          >
            <i 
              className="fas fa-upload" 
              style={{
                animation: animatedIcons.has('import-button') ? 'iconBounce 0.6s ease-in-out infinite' : 'none',
                transform: animatedIcons.has('import-button') ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease'
              }}
            />
            Import
            <input
              type="file"
              accept=".json"
              onChange={onImport}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        
        <div style={{ width: '2px', height: '24px', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '1px', opacity: 0.3 }} />
        
        {/* Panel Controls - Including Chat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleIconAnimation('components-button');
              setTimeout(() => onToggleComponentLibrary(), 200);
            }}
            title="Toggle Component Library (Ctrl+K)"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#495057',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#667eea';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.color = '#495057';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
          >
            <i 
              className="fas fa-th-large" 
              style={{
                animation: animatedIcons.has('components-button') ? 'iconBounce 0.6s ease-in-out infinite' : 'none',
                transform: animatedIcons.has('components-button') ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease'
              }}
            />
            Components
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleIconAnimation('chat-button');
              setTimeout(() => onToggleChat(), 200);
            }}
            title={`${showChat ? 'Hide' : 'Show'} Chat Panel`}
            style={{
              background: showChat ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(255, 255, 255, 0.9)',
              border: `1px solid ${showChat ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.2)'}`,
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: showChat ? 'white' : '#495057',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => {
              if (!showChat) {
                e.currentTarget.style.background = '#667eea';
                e.currentTarget.style.color = 'white';
              }
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)';
            }}
            onMouseLeave={(e) => {
              if (!showChat) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                e.currentTarget.style.color = '#495057';
              }
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
          >
            <i 
              className="fas fa-comments" 
              style={{
                animation: animatedIcons.has('chat-button') ? 'iconShake 0.5s ease-in-out infinite' : 'none',
                transform: animatedIcons.has('chat-button') ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease'
              }}
            />
            Chat
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleIconAnimation('log-button');
              setTimeout(() => onToggleLog(), 200);
            }}
            title={`${showLog ? 'Hide' : 'Show'} Log Panel`}
            style={{
              background: showLog ? 'linear-gradient(135deg, #f39c12, #e67e22)' : 'rgba(255, 255, 255, 0.9)',
              border: `1px solid ${showLog ? 'rgba(243, 156, 18, 0.3)' : 'rgba(243, 156, 18, 0.2)'}`,
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: showLog ? 'white' : '#f39c12',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => {
              if (!showLog) {
                e.currentTarget.style.background = '#f39c12';
                e.currentTarget.style.color = 'white';
              }
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(243, 156, 18, 0.3)';
            }}
            onMouseLeave={(e) => {
              if (!showLog) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                e.currentTarget.style.color = '#f39c12';
              }
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
          >
            <i 
              className="fas fa-list-alt" 
              style={{
                animation: animatedIcons.has('log-button') ? 'iconShake 0.5s ease-in-out infinite' : 'none',
                transform: animatedIcons.has('log-button') ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease'
              }}
            />
            Log
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleIconAnimation('settings-button');
              setTimeout(() => onToggleSettings(), 200);
            }}
            title="Toggle Settings"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(108, 117, 125, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#6c757d',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#6c757d';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(108, 117, 125, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.color = '#6c757d';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
          >
            <i 
              className="fas fa-cog" 
              style={{
                animation: animatedIcons.has('settings-button') ? 'iconSpin 1s linear infinite' : 'none',
                transform: animatedIcons.has('settings-button') ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease'
              }}
            />
            Settings
          </button>
        </div>
      </div>
      
      {/* Right Section - LIVE Status Only */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Live Status - Alone on Right */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleIconAnimation('live-toggle');
            setTimeout(() => onToggleLiveMode(), 200);
          }}
          title={`${liveMode ? 'Disable' : 'Enable'} Live Mode`}
          style={{
            background: liveMode ? 'linear-gradient(135deg, #28a745, #20c997)' : 'rgba(220, 53, 69, 0.9)',
            border: `1px solid ${liveMode ? 'rgba(40, 167, 69, 0.3)' : 'rgba(220, 53, 69, 0.3)'}`,
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '13px',
            color: 'white',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            boxShadow: liveMode ? '0 2px 4px rgba(40, 167, 69, 0.2)' : '0 2px 4px rgba(220, 53, 69, 0.2)',
            minWidth: '60px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = liveMode ? '0 4px 8px rgba(40, 167, 69, 0.4)' : '0 4px 8px rgba(220, 53, 69, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = liveMode ? '0 2px 4px rgba(40, 167, 69, 0.2)' : '0 2px 4px rgba(220, 53, 69, 0.2)';
          }}
        >
          <span style={{
            animation: animatedIcons.has('live-toggle') ? 'iconPulse 0.6s ease-in-out infinite' : 'none',
            transform: animatedIcons.has('live-toggle') ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.2s ease'
          }}>
            {liveMode ? 'LIVE' : 'OFF'}
          </span>
        </button>
      </div>
    </div>
  );
}); 