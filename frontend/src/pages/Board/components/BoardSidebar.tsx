import React, { useState } from 'react';
import { getNodeTypesByCategory, createNodeInstance } from './nodeTypes';
import type { BaseNodeData } from './nodeTypes';

interface BoardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onDragStart: (nodeType: string, nodeConfig: any) => void;
  onDragEnd: () => void;
  onNodeTypeSelect?: (nodeType: string) => void;
}

const BoardSidebar: React.FC<BoardSidebarProps> = ({
  isOpen,
  onClose,
  onDragStart,
  onDragEnd,
  onNodeTypeSelect
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['triggers', 'processing']) // Default expanded categories
  );
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  const nodeCategories = getNodeTypesByCategory();

  const categoryLabels = {
    triggers: { label: '🎯 Triggers', description: 'Start workflow execution' },
    processing: { label: '⚙️ Processing', description: 'Transform and process data' },
    logic: { label: '🤔 Logic', description: 'Decision making and routing' },
    ai: { label: '🤖 AI Agents', description: 'AI-powered processing' },
    integration: { label: '🔌 Integration', description: 'External services and APIs' },
    flow: { label: '🔄 Flow Control', description: 'Control workflow execution' },
    output: { label: '📤 Output', description: 'Send results and responses' }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, nodeType: string, nodeConfig: any) => {
    setDraggedNode(nodeType);
    
    // Create ghost image for drag
    const dragImage = document.createElement('div');
    dragImage.style.cssText = `
      padding: 8px 16px;
      background: linear-gradient(135deg, ${nodeConfig.color}, ${nodeConfig.color}dd);
      color: white;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      position: absolute;
      top: -1000px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    dragImage.textContent = `${nodeConfig.icon} ${nodeConfig.label}`;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 50, 20);
    
    // Clean up after drag
    setTimeout(() => document.body.removeChild(dragImage), 0);
    
    onDragStart(nodeType, nodeConfig);
  };

  const handleDragEnd = () => {
    setDraggedNode(null);
    onDragEnd();
  };

  const handleNodeClick = (nodeType: string) => {
    if (onNodeTypeSelect) {
      onNodeTypeSelect(nodeType);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 998,
        }}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: '320px',
          background: 'white',
          boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '2px solid #e0e0e0',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid rgba(255,255,255,0.2)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
              📦 Component Library
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
              Drag components to build your workflow
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0',
          }}
        >
          {Object.entries(nodeCategories).map(([categoryKey, nodes]) => {
            const categoryInfo = categoryLabels[categoryKey as keyof typeof categoryLabels];
            const isExpanded = expandedCategories.has(categoryKey);
            
            return (
              <div key={categoryKey} style={{ borderBottom: '1px solid #f0f0f0' }}>
                {/* Category Header */}
                <div
                  onClick={() => toggleCategory(categoryKey)}
                  style={{
                    padding: '16px 20px',
                    background: isExpanded ? '#f8f9fa' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    borderLeft: isExpanded ? '4px solid #667eea' : '4px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.style.background = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '700', 
                        color: '#2c3e50',
                        marginBottom: '2px'
                      }}>
                        {categoryInfo?.label}
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#6c757d',
                        fontWeight: '500'
                      }}>
                        {categoryInfo?.description}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#667eea',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease',
                    }}>
                      ▶
                    </div>
                  </div>
                </div>

                {/* Category Items */}
                {isExpanded && (
                  <div style={{ 
                    background: '#fafbfc',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {Object.entries(nodes).map(([nodeType, nodeConfig]) => (
                      <div
                        key={nodeType}
                        draggable
                        onDragStart={(e) => handleDragStart(e, nodeType, nodeConfig)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleNodeClick(nodeType)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px 24px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          borderBottom: '1px solid #f0f0f0',
                          background: draggedNode === nodeType ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                          borderLeft: '4px solid transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                          e.currentTarget.style.borderLeft = `4px solid ${nodeConfig.color}`;
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          if (draggedNode !== nodeType) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderLeft = '4px solid transparent';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }
                        }}
                      >
                        {/* Node Icon */}
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: `linear-gradient(135deg, ${nodeConfig.color}, ${nodeConfig.color}dd)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            marginRight: '12px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            transition: 'transform 0.2s ease',
                          }}
                        >
                          {nodeConfig.icon}
                        </div>

                        {/* Node Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#2c3e50',
                            marginBottom: '2px',
                          }}>
                            {nodeConfig.label}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: '#6c757d',
                            lineHeight: '1.3',
                          }}>
                            {nodeConfig.description}
                          </div>
                          
                          {/* Tools indicator for AI agents */}
                          {nodeConfig.tools && nodeConfig.tools.length > 0 && (
                            <div style={{
                              marginTop: '4px',
                              display: 'flex',
                              gap: '4px',
                              flexWrap: 'wrap',
                            }}>
                              {nodeConfig.tools.slice(0, 3).map((tool: string) => (
                                <span
                                  key={tool}
                                  style={{
                                    fontSize: '9px',
                                    padding: '2px 6px',
                                    background: 'rgba(102, 126, 234, 0.1)',
                                    borderRadius: '4px',
                                    color: '#667eea',
                                    fontWeight: '600',
                                  }}
                                >
                                  {tool}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Drag indicator */}
                        <div style={{
                          fontSize: '12px',
                          color: '#bbb',
                          marginLeft: '8px',
                        }}>
                          ⋮⋮
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            background: '#f8f9fa',
            borderTop: '1px solid #e0e0e0',
            fontSize: '11px',
            color: '#6c757d',
            textAlign: 'center',
          }}
        >
          💡 <strong>Tip:</strong> Drag components to the canvas or click to add at center
        </div>
      </div>
    </>
  );
};

export default BoardSidebar; 