import React from 'react';

interface Shortcut {
  keys: string;
  desc: string;
}

interface BeautifulHelpDialogProps {
  open: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
}

const BeautifulHelpDialog: React.FC<BeautifulHelpDialogProps> = ({ open, onClose, shortcuts }) => {
  if (!open) return null;

  const helpSections = {
    'Navigation': [
      { keys: '↑↓←→', desc: 'Move selected nodes' },
      { keys: 'Mouse Wheel', desc: 'Zoom in/out' },
      { keys: 'Click + Drag', desc: 'Pan the board' },
      { keys: 'Double Click', desc: 'Connect nodes' }
    ],
    'Selection': [
      { keys: 'Click', desc: 'Select single node' },
      { keys: 'Ctrl + Click', desc: 'Multi-select nodes' },
      { keys: 'Ctrl + A', desc: 'Select all nodes' },
      { keys: 'Esc', desc: 'Clear selection' }
    ],
    'Editing': [
      { keys: 'Delete', desc: 'Delete selected nodes' },
      { keys: 'Ctrl + Z', desc: 'Undo action' },
      { keys: 'Ctrl + Y', desc: 'Redo action' },
      { keys: 'Ctrl + D', desc: 'Duplicate nodes' }
    ],
    'Tools': [
      { keys: 'Ctrl + /', desc: 'Toggle chat panel' },
      { keys: 'Ctrl + L', desc: 'Toggle log panel' },
      { keys: 'Ctrl + M', desc: 'Toggle minimap' },
      { keys: 'Ctrl + S', desc: 'Save workflow' }
    ],
    'View': [
      { keys: '+', desc: 'Zoom in' },
      { keys: '-', desc: 'Zoom out' },
      { keys: '0', desc: 'Reset zoom' },
      { keys: 'F', desc: 'Fit to screen' }
    ]
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '12px',
          maxWidth: '800px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#666',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          ×
        </button>

        {/* Content */}
        <div style={{ padding: '32px' }}>
          {/* Title */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '32px'
          }}>
            <h2 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '24px', 
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              Keyboard Shortcuts
            </h2>
            <p style={{ 
              margin: 0, 
              color: '#6c757d', 
              fontSize: '14px'
            }}>
              Master your workflow with these shortcuts
            </p>
          </div>

          {/* Sections Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px'
          }}>
            {Object.entries(helpSections).map(([section, items]) => (
              <div key={section} style={{
                background: '#f8f9fa',
                borderRadius: '8px',
                padding: '20px',
                border: '1px solid #e9ecef'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#495057',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '16px',
                    background: '#667eea',
                    borderRadius: '2px'
                  }} />
                  {section}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map((item, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: index < items.length - 1 ? '1px solid #e9ecef' : 'none'
                    }}>
                      <span style={{ 
                        fontSize: '13px', 
                        color: '#495057',
                        flex: 1
                      }}>
                        {item.desc}
                      </span>
                      <div style={{
                        background: 'white',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#495057',
                        fontFamily: 'monospace',
                        minWidth: 'fit-content',
                        textAlign: 'center'
                      }}>
                        {item.keys}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            marginTop: '32px',
            textAlign: 'center',
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <p style={{ 
              margin: 0, 
              fontSize: '12px', 
              color: '#6c757d'
            }}>
              💡 <strong>Pro Tip:</strong> Hold Shift while dragging to create precise connections between nodes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeautifulHelpDialog; 