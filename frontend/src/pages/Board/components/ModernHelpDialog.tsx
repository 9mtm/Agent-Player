import React, { useState } from 'react';

interface Shortcut {
  keys: string;
  desc: string;
  category: string;
}

interface ModernHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const ModernHelpDialog: React.FC<ModernHelpDialogProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState('shortcuts');
  const [searchTerm, setSearchTerm] = useState('');

  if (!open) return null;

  const shortcuts = [
    // Navigation & View
    { keys: 'Space + Drag', desc: 'Pan around the board', category: 'navigation' },
    { keys: 'Ctrl + Scroll', desc: 'Zoom in/out', category: 'navigation' },
    { keys: 'Ctrl + 0', desc: 'Reset zoom to 100%', category: 'navigation' },
    { keys: 'Ctrl + 1', desc: 'Fit board to screen', category: 'navigation' },
    { keys: 'Ctrl + M', desc: 'Toggle minimap', category: 'navigation' },
    
    // Node Operations
    { keys: 'Click', desc: 'Select node', category: 'nodes' },
    { keys: 'Ctrl + Click', desc: 'Multi-select nodes', category: 'nodes' },
    { keys: 'Double-click', desc: 'Connect nodes', category: 'nodes' },
    { keys: 'Drag', desc: 'Move node', category: 'nodes' },
    { keys: 'Delete', desc: 'Delete selected nodes', category: 'nodes' },
    { keys: 'Escape', desc: 'Cancel selection/connection', category: 'nodes' },
    
    // Workflow Management
    { keys: 'Ctrl + S', desc: 'Save board', category: 'workflow' },
    { keys: 'Ctrl + Z', desc: 'Undo action', category: 'workflow' },
    { keys: 'Ctrl + Y', desc: 'Redo action', category: 'workflow' },
    { keys: 'Ctrl + A', desc: 'Select all nodes', category: 'workflow' },
    { keys: 'Ctrl + D', desc: 'Duplicate selection', category: 'workflow' },
    { keys: 'Ctrl + G', desc: 'Group selected nodes', category: 'workflow' },
    
    // Import & Export
    { keys: 'Ctrl + E', desc: 'Export board', category: 'files' },
    { keys: 'Ctrl + I', desc: 'Import board', category: 'files' },
    { keys: 'Ctrl + Shift + E', desc: 'Export as image', category: 'files' },
    { keys: 'Ctrl + Shift + S', desc: 'Save as template', category: 'files' },
    
    // Chat & Help
    { keys: 'Ctrl + /', desc: 'Open chat panel', category: 'tools' },
    { keys: 'Ctrl + ?', desc: 'Show this help', category: 'tools' },
    { keys: 'Ctrl + K', desc: 'Clear chat history', category: 'tools' },
    { keys: 'Ctrl + Enter', desc: 'Send chat message', category: 'tools' },
    
    // Connection Types
    { keys: '1', desc: 'Set curved connections', category: 'connections' },
    { keys: '2', desc: 'Set straight connections', category: 'connections' },
    { keys: '3', desc: 'Set stepped connections', category: 'connections' },
    { keys: 'C', desc: 'Cycle connection types', category: 'connections' },
  ];

  const categories = [
    { id: 'navigation', name: 'Navigation & View', icon: '🧭', color: '#667eea' },
    { id: 'nodes', name: 'Node Operations', icon: '🔷', color: '#4facfe' },
    { id: 'workflow', name: 'Workflow Management', icon: '⚡', color: '#43e97b' },
    { id: 'files', name: 'Import & Export', icon: '📁', color: '#fa709a' },
    { id: 'tools', name: 'Chat & Tools', icon: '🛠️', color: '#ffeaa7' },
    { id: 'connections', name: 'Connections', icon: '🔗', color: '#fd79a8' },
  ];

  const tips = [
    {
      icon: '💡',
      title: 'Pro Tip',
      description: 'Hold Shift while dragging to constrain movement to horizontal or vertical axes'
    },
    {
      icon: '⚡',
      title: 'Quick Connect',
      description: 'Double-click a node, then double-click another to instantly connect them'
    },
    {
      icon: '🎯',
      title: 'Focus Mode',
      description: 'Right-click on empty space and select "Focus Mode" to hide UI distractions'
    },
    {
      icon: '🔍',
      title: 'Find Anything',
      description: 'Press Ctrl+F to search for specific nodes in large workflows'
    },
    {
      icon: '🎨',
      title: 'Theme Switch',
      description: 'Press T to quickly toggle between light and dark themes'
    },
    {
      icon: '🤖',
      title: 'AI Assistant',
      description: 'Use @ in chat to mention specific nodes for targeted AI assistance'
    }
  ];

  const filteredShortcuts = shortcuts.filter(shortcut =>
    shortcut.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shortcut.keys.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedShortcuts = categories.reduce((acc, category) => {
    acc[category.id] = filteredShortcuts.filter(shortcut => shortcut.category === category.id);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(12px)',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 50px 100px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '32px 40px 24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background Pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 1px, transparent 1px), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '32px', 
              fontWeight: '700',
              background: 'linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              ⌨️ Keyboard Shortcuts & Help
            </h1>
            <p style={{ 
              margin: 0, 
              fontSize: '18px', 
              opacity: 0.9,
              fontWeight: '400'
            }}>
              Master your workflow with powerful shortcuts and expert tips
            </p>
          </div>
          
          <button
            onClick={onClose}
            style={{
              position: 'relative',
              zIndex: 1,
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              width: '44px',
              height: '44px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          {[
            { id: 'shortcuts', name: 'Shortcuts', icon: '⌨️' },
            { id: 'tips', name: 'Tips & Tricks', icon: '💡' },
            { id: 'about', name: 'About', icon: 'ℹ️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '16px 24px',
                background: activeTab === tab.id ? 'white' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #667eea' : '3px solid transparent',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                color: activeTab === tab.id ? '#667eea' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '18px' }}>{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '32px 40px',
          background: 'white'
        }}>
          {activeTab === 'shortcuts' && (
            <div>
              {/* Search Bar */}
              <div style={{
                marginBottom: '32px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'relative',
                  maxWidth: '400px'
                }}>
                  <input
                    type="text"
                    placeholder="Search shortcuts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px 20px 16px 48px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '16px',
                      background: '#f8fafc',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '20px',
                    color: '#64748b'
                  }}>
                    🔍
                  </div>
                </div>
              </div>

              {/* Categories Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                gap: '24px'
              }}>
                {categories.map((category) => {
                  const categoryShortcuts = groupedShortcuts[category.id];
                  if (!categoryShortcuts?.length) return null;
                  
                  return (
                    <div key={category.id} style={{
                      background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                      borderRadius: '16px',
                      padding: '24px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                    }}
                    >
                      <h3 style={{
                        margin: '0 0 20px 0',
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: `linear-gradient(135deg, ${category.color}, ${category.color}dd)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px'
                        }}>
                          {category.icon}
                        </div>
                        {category.name}
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {categoryShortcuts.map((shortcut, index) => (
                          <div key={index} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: 'white',
                            borderRadius: '10px',
                            border: '1px solid #f1f5f9',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = category.color;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.borderColor = '#f1f5f9';
                          }}
                          >
                            <span style={{ 
                              fontSize: '15px', 
                              color: '#334155',
                              fontWeight: '500',
                              flex: 1
                            }}>
                              {shortcut.desc}
                            </span>
                            <kbd style={{
                              background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
                              border: '1px solid #cbd5e1',
                              borderBottom: '3px solid #94a3b8',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#475569',
                              fontFamily: 'SFMono-Regular, Monaco, Consolas, monospace',
                              minWidth: 'fit-content',
                              textAlign: 'center',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                            }}>
                              {shortcut.keys}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'tips' && (
            <div>
              <div style={{ 
                marginBottom: '32px',
                textAlign: 'center'
              }}>
                <h2 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '28px', 
                  fontWeight: '700',
                  color: '#1e293b'
                }}>
                  💡 Pro Tips & Tricks
                </h2>
                <p style={{ 
                  margin: 0, 
                  color: '#64748b', 
                  fontSize: '18px'
                }}>
                  Level up your workflow with these expert techniques
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '20px'
              }}>
                {tips.map((tip, index) => (
                  <div key={index} style={{
                    background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                  }}
                  >
                    <div style={{
                      fontSize: '36px',
                      marginBottom: '16px',
                      textAlign: 'center'
                    }}>
                      {tip.icon}
                    </div>
                    <h3 style={{
                      margin: '0 0 12px 0',
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#1e293b',
                      textAlign: 'center'
                    }}>
                      {tip.title}
                    </h3>
                    <p style={{
                      margin: 0,
                      fontSize: '16px',
                      color: '#475569',
                      lineHeight: '1.6',
                      textAlign: 'center'
                    }}>
                      {tip.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '24px' }}>
                🚀
              </div>
              <h2 style={{
                margin: '0 0 16px 0',
                fontSize: '32px',
                fontWeight: '700',
                color: '#1e293b'
              }}>
                Dpro AI Agent Board
              </h2>
              <p style={{
                margin: '0 0 32px 0',
                fontSize: '18px',
                color: '#64748b',
                lineHeight: '1.6'
              }}>
                A powerful visual workflow builder with AI-powered assistance. Create, connect, and automate your processes with an intuitive drag-and-drop interface.
              </p>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '20px',
                marginTop: '32px'
              }}>
                {[
                  { icon: '🎨', label: 'Beautiful UI' },
                  { icon: '⚡', label: 'Fast Performance' },
                  { icon: '🤖', label: 'AI Powered' },
                  { icon: '🔗', label: 'Smart Connections' }
                ].map((feature, index) => (
                  <div key={index} style={{
                    padding: '20px',
                    background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                      {feature.icon}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                      {feature.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 40px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '14px',
          color: '#64748b'
        }}>
          <div>
            Press <kbd style={{
              background: '#e2e8f0',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: '600',
              color: '#475569'
            }}>Ctrl+?</kbd> anytime to open this help
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default ModernHelpDialog; 