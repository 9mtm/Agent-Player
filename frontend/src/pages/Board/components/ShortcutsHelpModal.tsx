import React from 'react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const shortcutCategories = [
    {
      title: 'Navigation & View',
      icon: 'fas fa-arrows-alt',
      shortcuts: [
        { key: 'Space + Drag', action: 'Pan around the board' },
        { key: 'Ctrl + Scroll', action: 'Zoom in/out' },
        { key: 'Ctrl + 0', action: 'Reset zoom to 100%' },
        { key: 'Ctrl + 1', action: 'Fit board to screen' },
        { key: 'Ctrl + M', action: 'Toggle minimap' },
        { key: 'F11', action: 'Toggle fullscreen' }
      ]
    },
    {
      title: 'Node Operations',
      icon: 'fas fa-cubes',
      shortcuts: [
        { key: 'Click', action: 'Select node' },
        { key: 'Ctrl + Click', action: 'Multi-select nodes' },
        { key: 'Double-click', action: 'Connect nodes' },
        { key: 'Drag', action: 'Move node' },
        { key: 'Delete', action: 'Delete selected nodes' },
        { key: 'Escape', action: 'Cancel selection/connection' }
      ]
    },
    {
      title: 'Workflow Management',
      icon: 'fas fa-project-diagram',
      shortcuts: [
        { key: 'Ctrl + S', action: 'Save board' },
        { key: 'Ctrl + Z', action: 'Undo action' },
        { key: 'Ctrl + Y', action: 'Redo action' },
        { key: 'Ctrl + A', action: 'Select all nodes' },
        { key: 'Ctrl + D', action: 'Duplicate selection' },
        { key: 'Ctrl + G', action: 'Group selected nodes' }
      ]
    },
    {
      title: 'Import & Export',
      icon: 'fas fa-exchange-alt',
      shortcuts: [
        { key: 'Ctrl + E', action: 'Export board' },
        { key: 'Ctrl + I', action: 'Import board' },
        { key: 'Ctrl + Shift + E', action: 'Export as image' },
        { key: 'Ctrl + Shift + S', action: 'Save as template' }
      ]
    },
    {
      title: 'Chat & Help',
      icon: 'fas fa-comment-dots',
      shortcuts: [
        { key: 'Ctrl + /', action: 'Open chat panel' },
        { key: 'Ctrl + ?', action: 'Show this help (current)' },
        { key: 'Ctrl + K', action: 'Clear chat history' },
        { key: 'Ctrl + Enter', action: 'Send chat message' }
      ]
    },
    {
      title: 'Connection Types',
      icon: 'fas fa-bezier-curve',
      shortcuts: [
        { key: '1', action: 'Set curved connections' },
        { key: '2', action: 'Set straight connections' },
        { key: '3', action: 'Set stepped connections' },
        { key: 'C', action: 'Cycle connection types' }
      ]
    }
  ];

  const tips = [
    {
      icon: 'fas fa-lightbulb',
      title: 'Pro Tip',
      description: 'Hold Shift while dragging to constrain movement to horizontal or vertical'
    },
    {
      icon: 'fas fa-magic',
      title: 'Quick Connect',
      description: 'Double-click a node, then double-click another to quickly connect them'
    },
    {
      icon: 'fas fa-eye',
      title: 'Focus Mode',
      description: 'Right-click on empty space and select "Focus Mode" to hide distractions'
    },
    {
      icon: 'fas fa-search',
      title: 'Find Nodes',
      description: 'Press Ctrl+F to search for specific nodes in large workflows'
    },
    {
      icon: 'fas fa-palette',
      title: 'Themes',
      description: 'Press T to quickly switch between light and dark themes'
    },
    {
      icon: 'fas fa-robot',
      title: 'AI Assistant',
      description: 'Use @ in chat to mention specific nodes for targeted assistance'
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      backdropFilter: 'blur(8px)'
    }} onClick={onClose}>
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          width: '90%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '30px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>
              <i className="fas fa-keyboard" style={{ marginRight: '12px' }}></i>
              Keyboard Shortcuts & Help
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '16px', opacity: 0.9 }}>
              Master your workflow with these powerful shortcuts and tips
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              padding: '12px 15px',
              fontSize: '18px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '30px',
          overflowY: 'auto',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}>
          {/* Shortcuts Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            marginBottom: '40px'
          }}>
            {shortcutCategories.map((category, index) => (
              <div
                key={index}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '20px',
                  paddingBottom: '12px',
                  borderBottom: '2px solid #f0f0f0'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px'
                  }}>
                    <i className={category.icon} style={{ color: 'white', fontSize: '16px' }}></i>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#333' }}>
                    {category.title}
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {category.shortcuts.map((shortcut, shortcutIndex) => (
                    <div
                      key={shortcutIndex}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0'
                      }}
                    >
                      <span style={{ 
                        fontSize: '14px', 
                        color: '#555',
                        flex: 1
                      }}>
                        {shortcut.action}
                      </span>
                      <kbd style={{
                        background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#495057',
                        fontFamily: 'monospace',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        marginLeft: '12px'
                      }}>
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tips Section */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#333',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              <i className="fas fa-star" style={{ marginRight: '8px', color: '#ffc107' }}></i>
              Pro Tips & Tricks
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {tips.map((tip, index) => (
                <div
                  key={index}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #ffc107, #ff9800)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className={tip.icon} style={{ color: 'white', fontSize: '14px' }}></i>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>
                        {tip.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
                        {tip.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Reference Card */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '24px',
            color: 'white',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600' }}>
              <i className="fas fa-rocket" style={{ marginRight: '8px' }}></i>
              Quick Reference
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '16px', opacity: 0.9 }}>
              Remember: Most shortcuts work with common patterns (Ctrl+Key), and you can always press <kbd style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: '600'
              }}>Ctrl+?</kbd> to see this help again.
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '20px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-mouse"></i>
                <span>Mouse + Keyboard</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-comments"></i>
                <span>AI Assistant</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-tachometer-alt"></i>
                <span>Performance Optimized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 