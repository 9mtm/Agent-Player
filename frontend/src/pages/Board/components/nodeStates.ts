// Node states and animations for workflow execution
export type NodeState =
  | "idle" // Normal state
  | "pending" // Waiting for execution
  | "processing" // In progress
  | "completed" // Successfully completed
  | "error" // Error/problem
  | "warning" // Needs modification
  | "paused" // Temporarily stopped
  | "skipped"; // Skipped

export interface NodeStateConfig {
  color: string;
  backgroundColor: string;
  borderColor: string;
  boxShadow: string;
  animation?: string;
  pulseColor?: string;
  icon?: string;
}

// Configuration of colors and animations for each state
export const NODE_STATE_CONFIGS: Record<NodeState, NodeStateConfig> = {
  idle: {
    color: "#2c3e50",
    backgroundColor: "linear-gradient(135deg, #ffffff, #f8f9fa)",
    borderColor: "#ddd",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },

  pending: {
    color: "#3498db",
    backgroundColor: "linear-gradient(135deg, #e3f2fd, #bbdefb)",
    borderColor: "#2196f3",
    boxShadow: "0 2px 12px rgba(33, 150, 243, 0.3)",
    animation: "pulse-blue",
    pulseColor: "#2196f3",
  },

  processing: {
    color: "#ffffff",
    backgroundColor: "linear-gradient(135deg, #ff9800, #ffa726)",
    borderColor: "#ff9800",
    boxShadow: "0 4px 20px rgba(255, 152, 0, 0.4)",
    animation: "processing-spin",
    pulseColor: "#ff9800",
  },

  completed: {
    color: "#ffffff",
    backgroundColor: "linear-gradient(135deg, #4caf50, #66bb6a)",
    borderColor: "#4caf50",
    boxShadow: "0 4px 16px rgba(76, 175, 80, 0.3)",
    animation: "success-glow",
    pulseColor: "#4caf50",
  },

  error: {
    color: "#ffffff",
    backgroundColor: "linear-gradient(135deg, #f44336, #ef5350)",
    borderColor: "#f44336",
    boxShadow: "0 4px 20px rgba(244, 67, 54, 0.4)",
    animation: "error-shake",
    pulseColor: "#f44336",
  },

  warning: {
    color: "#ffffff",
    backgroundColor: "linear-gradient(135deg, #ff9800, #ffb74d)",
    borderColor: "#ff9800",
    boxShadow: "0 4px 16px rgba(255, 152, 0, 0.3)",
    animation: "warning-pulse",
    pulseColor: "#ff9800",
  },

  paused: {
    color: "#666",
    backgroundColor: "linear-gradient(135deg, #9e9e9e, #bdbdbd)",
    borderColor: "#9e9e9e",
    boxShadow: "0 2px 8px rgba(158, 158, 158, 0.3)",
    animation: "pause-fade",
  },

  skipped: {
    color: "#999",
    backgroundColor: "linear-gradient(135deg, #f5f5f5, #eeeeee)",
    borderColor: "#ddd",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    animation: "skip-dash",
  },
};

// CSS animations for different states
export const NODE_ANIMATIONS_CSS = `
  /* Processing Animation - Rotating gradient */
  @keyframes processing-spin {
    0% { 
      background: linear-gradient(0deg, #ff9800, #ffa726);
      transform: scale(1);
    }
    25% { 
      background: linear-gradient(90deg, #ff9800, #ffa726);
      transform: scale(1.02);
    }
    50% { 
      background: linear-gradient(180deg, #ff9800, #ffa726);
      transform: scale(1);
    }
    75% { 
      background: linear-gradient(270deg, #ff9800, #ffa726);
      transform: scale(1.02);
    }
    100% { 
      background: linear-gradient(360deg, #ff9800, #ffa726);
      transform: scale(1);
    }
  }

  /* Pending Animation - Blue pulse */
  @keyframes pulse-blue {
    0%, 100% { 
      box-shadow: 0 2px 12px rgba(33, 150, 243, 0.3);
      transform: scale(1);
    }
    50% { 
      box-shadow: 0 4px 20px rgba(33, 150, 243, 0.6);
      transform: scale(1.01);
    }
  }

  /* Success Animation - Green glow */
  @keyframes success-glow {
    0% { 
      box-shadow: 0 4px 16px rgba(76, 175, 80, 0.3);
    }
    50% { 
      box-shadow: 0 6px 24px rgba(76, 175, 80, 0.5);
    }
    100% { 
      box-shadow: 0 4px 16px rgba(76, 175, 80, 0.3);
    }
  }

  /* Error Animation - Red shake */
  @keyframes error-shake {
    0%, 100% { 
      transform: translateX(0);
      box-shadow: 0 4px 20px rgba(244, 67, 54, 0.4);
    }
    10%, 30%, 50%, 70%, 90% { 
      transform: translateX(-2px);
      box-shadow: 0 4px 24px rgba(244, 67, 54, 0.6);
    }
    20%, 40%, 60%, 80% { 
      transform: translateX(2px);
      box-shadow: 0 4px 24px rgba(244, 67, 54, 0.6);
    }
  }

  /* Warning Animation - Orange pulse */
  @keyframes warning-pulse {
    0%, 100% { 
      box-shadow: 0 4px 16px rgba(255, 152, 0, 0.3);
      opacity: 1;
    }
    50% { 
      box-shadow: 0 6px 24px rgba(255, 152, 0, 0.5);
      opacity: 0.9;
    }
  }

  /* Pause Animation - Fade effect */
  @keyframes pause-fade {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  /* Skip Animation - Dashed border effect */
  @keyframes skip-dash {
    0% { border-style: solid; }
    50% { border-style: dashed; }
    100% { border-style: solid; }
  }

  /* Data Flow Animation - Moving dots */
  @keyframes data-flow {
    0% { 
      background-position: 0% 50%;
      opacity: 0.8;
    }
    50% { 
      opacity: 1;
    }
    100% { 
      background-position: 100% 50%;
      opacity: 0.8;
    }
  }

  /* Node state classes */
  .node-processing {
    animation: processing-spin 2s ease-in-out infinite;
  }

  .node-pending {
    animation: pulse-blue 1.5s ease-in-out infinite;
  }

  .node-completed {
    animation: success-glow 2s ease-in-out infinite;
  }

  .node-error {
    animation: error-shake 0.5s ease-in-out 3;
  }

  .node-warning {
    animation: warning-pulse 1.8s ease-in-out infinite;
  }

  .node-paused {
    animation: pause-fade 2s ease-in-out infinite;
  }

  .node-skipped {
    animation: skip-dash 1s ease-in-out infinite;
  }

  /* Data flow between nodes */
  .data-flow-line {
    position: absolute;
    height: 3px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      #2196f3 20%, 
      #4caf50 50%, 
      #2196f3 80%, 
      transparent 100%
    );
    background-size: 200% 100%;
    animation: data-flow 1.5s linear infinite;
    border-radius: 2px;
    z-index: 5;
  }

  /* Workflow execution indicator */
  .workflow-active {
    position: relative;
  }

  .workflow-active::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, #2196f3, #4caf50, #ff9800, #2196f3);
    background-size: 300% 300%;
    animation: workflow-border 3s ease infinite;
    border-radius: inherit;
    z-index: -1;
  }

  @keyframes workflow-border {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
`;

// Helper functions for state management
export const getNodeStateConfig = (state: NodeState): NodeStateConfig => {
  return NODE_STATE_CONFIGS[state];
};

export const getNodeStateClass = (state: NodeState): string => {
  return `node-${state}`;
};

// Workflow execution states
export interface WorkflowExecution {
  id: string;
  status: "running" | "paused" | "completed" | "error";
  currentNode?: string;
  completedNodes: string[];
  errorNodes: string[];
  progress: number; // 0-100
}

// Data flow animation between nodes
export interface DataFlow {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  data?: any;
  status: "flowing" | "completed" | "error";
  startTime: number;
  duration: number; // milliseconds
}

export const createDataFlow = (
  fromNode: string,
  toNode: string,
  duration: number = 1500
): DataFlow => ({
  id: `flow-${fromNode}-${toNode}-${Date.now()}`,
  fromNodeId: fromNode,
  toNodeId: toNode,
  status: "flowing",
  startTime: Date.now(),
  duration,
});

// State transition helpers
export const getNextNodeState = (
  currentState: NodeState,
  action: string
): NodeState => {
  const transitions: Record<NodeState, Record<string, NodeState>> = {
    idle: {
      start: "pending",
      skip: "skipped",
    },
    pending: {
      process: "processing",
      skip: "skipped",
      pause: "paused",
    },
    processing: {
      complete: "completed",
      error: "error",
      warning: "warning",
      pause: "paused",
    },
    completed: {
      reset: "idle",
      reprocess: "processing",
    },
    error: {
      retry: "pending",
      reset: "idle",
      fix: "warning",
    },
    warning: {
      continue: "processing",
      reset: "idle",
    },
    paused: {
      resume: "processing",
      reset: "idle",
    },
    skipped: {
      reset: "idle",
      activate: "pending",
    },
  };

  return transitions[currentState]?.[action] || currentState;
};

export default {
  NODE_STATE_CONFIGS,
  NODE_ANIMATIONS_CSS,
  getNodeStateConfig,
  getNodeStateClass,
  createDataFlow,
  getNextNodeState,
};
