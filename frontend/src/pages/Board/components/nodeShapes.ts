// Node shape definitions for different node types
export interface NodeShape {
  width: number | string;
  height: number | string;
  borderRadius: string;
  className: string;
  description: string;
  icon: string; // FontAwesome icon class
}

export interface NodeShapeVariant {
  base: NodeShape;
  hover?: Partial<NodeShape>;
  selected?: Partial<NodeShape>;
  running?: Partial<NodeShape>;
}

// 🎯 The 8 Essential Node Shapes - User-Friendly and Clear
export const NODE_SHAPES: Record<string, NodeShapeVariant> = {
  // 🟢 START - Circle with Play Icon
  start: {
    base: {
      width: 100,
      height: 100,
      borderRadius: '50%', // Perfect circle
      className: 'node-start',
      description: 'Workflow starting point',
      icon: 'fas fa-play'
    },
    hover: {
      borderRadius: '50%',
    },
    selected: {
      borderRadius: '50%',
    }
  },

  // 🟦 PROCESS - Rectangle with Gear Icon
  process: {
    base: {
      width: 120,
      height: 70,
      borderRadius: '12px', // Rounded rectangle
      className: 'node-process',
      description: 'Data processing and transformation',
      icon: 'fas fa-cog'
    },
    hover: {
      borderRadius: '14px',
    }
  },

  // 🟡 DECISION - Diamond with Question Mark
  decision: {
    base: {
      width: 100,
      height: 100,
      borderRadius: '0', // Will be styled as diamond via CSS transform
      className: 'node-decision',
      description: 'Decision and conditional logic',
      icon: 'fas fa-question'
    },
    hover: {
      borderRadius: '0',
    }
  },

  // ⚡ API - Rounded Rectangle with Lightning
  api: {
    base: {
      width: 130,
      height: 70,
      borderRadius: '20px', // More rounded for API calls
      className: 'node-api',
      description: 'API calls and external requests',
      icon: 'fas fa-bolt'
    },
    running: {
      borderRadius: '22px',
    }
  },

  // ✉️ MESSAGE - Envelope Shape
  message: {
    base: {
      width: 120,
      height: 80,
      borderRadius: '8px 8px 20px 8px', // Envelope-like shape
      className: 'node-message',
      description: 'Send messages and notifications',
      icon: 'fas fa-envelope'
    },
    hover: {
      borderRadius: '10px 10px 22px 10px',
    }
  },

  // 🗄️ DATABASE - Cylinder Shape
  database: {
    base: {
      width: 110,
      height: 90,
      borderRadius: '50px 50px 15px 15px', // Cylinder-like top
      className: 'node-database',
      description: 'Data storage and database operations',
      icon: 'fas fa-database'
    },
    hover: {
      borderRadius: '52px 52px 17px 17px',
    }
  },

  // ✅ SUCCESS - Circle with Check Icon
  success: {
    base: {
      width: 100,
      height: 100,
      borderRadius: '50%',
      className: 'node-success',
      description: 'Success and completion states',
      icon: 'fas fa-check-circle'
    },
    hover: {
      borderRadius: '50%',
    }
  },

  // ⚠️ ERROR - Triangle with Warning Icon
  error: {
    base: {
      width: 100,
      height: 100,
      borderRadius: '0',
      className: 'node-error',
      description: 'Error handling and alerts',
      icon: 'fas fa-exclamation-triangle'
    },
    hover: {
      borderRadius: '0',
    }
  },

  // 📝 NOTE - Sticky Note Shape
  note: {
    base: {
      width: 150,
      height: 120,
      borderRadius: '12px 12px 12px 0px', // Sticky note corner
      className: 'node-note',
      description: 'Notes and documentation',
      icon: 'fas fa-sticky-note'
    },
    hover: {
      borderRadius: '14px 14px 14px 0px',
    }
  }
};

// Mapping node types to the 8 essential shapes
export const NODE_TYPE_TO_SHAPE: Record<string, string> = {
  // Start/Trigger types
  'manual': 'start',
  'chat': 'start', 
  'email': 'start',
  'webhook': 'start',
  'timer': 'start',
  'schedule': 'start',
  'file': 'start',

  // Process types
  'task': 'process',
  'code-transform': 'process',
  'edit-fields': 'process',
  'filter-transform': 'process',
  'aggregate': 'process',
  'summarize': 'process',
  'sort': 'process',
  'merge': 'process',
  'wait': 'process',

  // Decision/Logic types
  'condition': 'decision',
  'if': 'decision',
  'switch': 'decision',
  'compare-datasets': 'decision',
  'filter': 'decision',

  // API/HTTP types
  'http': 'api',
  'ai': 'api',
  'AI-agent': 'api',
  'OpenAI-Agent': 'api',
  'ai-prompt': 'api',
  'ai-transform': 'api',

  // Message/Communication types
  'discord': 'message',
  'gmail': 'message',
  'slack': 'message',
  'telegram': 'message',
  'send-email': 'message',
  'whatsapp-business-cloud': 'message',
  'microsoft-teams': 'message',
  'microsoft-outlook': 'message',

  // Database/Storage types
  'execution-data': 'database',
  'ftp': 'database',
  'compression': 'database',
  'convert-to-file': 'database',
  'extract-from-file': 'database',

  // Success/Completion types
  'action': 'success',
  'execute-sub-workflow': 'success',
  'respond-to-webhook': 'success',
  'Dpro-form': 'success',

  // Error types
  'stop-error': 'error',

  // Special types
  'note': 'note',
  'sticky-note': 'note',

  // Default fallback to process
  'no-operation': 'process'
};

// Helper function to get shape for a node type
export function getNodeShape(nodeType: string): NodeShapeVariant {
  const shapeKey = NODE_TYPE_TO_SHAPE[nodeType] || 'process';
  return NODE_SHAPES[shapeKey] || NODE_SHAPES.process;
}

// Helper function to get computed styles for a node
export function getNodeStyles(
  nodeType: string, 
  state: 'base' | 'hover' | 'selected' | 'running' = 'base',
  zoom: number = 1
): React.CSSProperties {
  const shape = getNodeShape(nodeType);
  const baseShape = shape.base;
  const stateOverride = shape[state] || {};
  
  const width = typeof baseShape.width === 'number' ? baseShape.width * zoom : baseShape.width;
  const height = typeof baseShape.height === 'number' ? baseShape.height * zoom : baseShape.height;
  
  return {
    width,
    height,
    borderRadius: stateOverride.borderRadius || baseShape.borderRadius,
    ...getShapeSpecificStyles(baseShape.className, state)
  };
}

// Shape-specific styling with modern, user-friendly colors
function getShapeSpecificStyles(className: string, state: string): React.CSSProperties {
  const baseStyles: React.CSSProperties = {
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid rgba(255,255,255,0.2)',
  };

  switch (className) {
    case 'node-start':
      return {
        ...baseStyles,
        background: state === 'selected' 
          ? 'linear-gradient(135deg, #4CAF50, #45a049)' 
          : 'linear-gradient(135deg, #4CAF50, #66BB6A)',
        boxShadow: state === 'hover' 
          ? '0 8px 25px rgba(76, 175, 80, 0.4)' 
          : '0 4px 15px rgba(76, 175, 80, 0.3)',
        color: '#fff',
      };

    case 'node-process':
      return {
        ...baseStyles,
        background: state === 'selected'
          ? 'linear-gradient(135deg, #2196F3, #1976D2)'
          : 'linear-gradient(135deg, #2196F3, #42A5F5)',
        boxShadow: state === 'hover'
          ? '0 8px 25px rgba(33, 150, 243, 0.4)'
          : '0 4px 15px rgba(33, 150, 243, 0.3)',
        color: '#fff',
      };

         case 'node-decision':
       return {
         ...baseStyles,
         background: 'linear-gradient(135deg, #FF9800, #F57C00)',
         transform: state === 'hover' ? 'rotate(45deg) scale(1.05)' : 'rotate(45deg)',
         boxShadow: '0 4px 15px rgba(255, 152, 0, 0.3)',
         color: '#fff',
       };

    case 'node-api':
      return {
        ...baseStyles,
        background: state === 'running'
          ? 'linear-gradient(135deg, #9C27B0, #7B1FA2)'
          : 'linear-gradient(135deg, #9C27B0, #BA68C8)',
        boxShadow: state === 'selected'
          ? '0 0 0 3px rgba(156, 39, 176, 0.4)'
          : '0 4px 15px rgba(156, 39, 176, 0.3)',
        color: '#fff',
      };

    case 'node-message':
      return {
        ...baseStyles,
        background: 'linear-gradient(135deg, #607D8B, #455A64)',
        boxShadow: '0 4px 15px rgba(96, 125, 139, 0.3)',
        color: '#fff',
        // Envelope effect
        position: 'relative',
      };

    case 'node-database':
      return {
        ...baseStyles,
        background: 'linear-gradient(180deg, #795548, #5D4037)',
        borderTop: '3px solid rgba(121, 85, 72, 0.8)',
        boxShadow: '0 4px 15px rgba(121, 85, 72, 0.3)',
        color: '#fff',
      };

    case 'node-success':
      return {
        ...baseStyles,
        background: 'linear-gradient(135deg, #4CAF50, #388E3C)',
        border: '3px solid rgba(76, 175, 80, 0.5)',
        boxShadow: state === 'hover'
          ? '0 0 20px rgba(76, 175, 80, 0.6)'
          : '0 4px 15px rgba(76, 175, 80, 0.4)',
        color: '#fff',
      };

    case 'node-error':
      return {
        ...baseStyles,
        background: 'linear-gradient(135deg, #F44336, #D32F2F)',
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', // Triangle shape
        boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)',
        color: '#fff',
      };

    case 'node-note':
      return {
        ...baseStyles,
        background: '#fffbe6',
        border: '2px solid #ffe066',
        boxShadow: '0 2px 8px rgba(255, 224, 102, 0.3)',
        color: '#333',
      };

    default:
      return {
        ...baseStyles,
        background: 'linear-gradient(135deg, #607D8B, #455A64)',
        color: '#fff',
      };
  }
} 