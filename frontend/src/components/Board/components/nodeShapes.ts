export interface NodeShape {
  name: string;
  shape: string;
  icon: string; // Changed from emoji to icon class
  backgroundColor: string;
  borderColor: string;
  hoverColor: string;
  selectedColor: string;
  runningColor: string;
  textColor: string;
}

export interface NodeShapeVariant {
  base: NodeShape;
  hover: NodeShape;
  selected: NodeShape;
  running: NodeShape;
}

// Icon mappings for different node types
export const NODE_ICONS = {
  // Trigger icons
  TRIGGER: 'fas fa-play',
  WEBHOOK: 'fas fa-globe',
  SCHEDULE: 'fas fa-clock',
  EMAIL: 'fas fa-envelope',
  
  // Process icons  
  PROCESS: 'fas fa-cog',
  CODE: 'fas fa-code',
  TRANSFORM: 'fas fa-exchange-alt',
  
  // Logic icons
  DECISION: 'fas fa-question',
  CONDITION: 'fas fa-question-circle',
  SWITCH: 'fas fa-random',
  LOOP: 'fas fa-redo',
  
  // API icons
  API: 'fas fa-bolt',
  HTTP: 'fas fa-server',
  REST: 'fas fa-plug',
  
  // AI icons
  AI: 'fas fa-robot',
  OPENAI: 'fas fa-brain',
  ML: 'fas fa-chart-line',
  
  // Data icons
  DATABASE: 'fas fa-database',
  STORAGE: 'fas fa-hdd',
  CACHE: 'fas fa-memory',
  
  // Communication icons
  MESSAGE: 'fas fa-comments',
  SLACK: 'fab fa-slack',
  DISCORD: 'fab fa-discord',
  
  // Result icons
  SUCCESS: 'fas fa-check-circle',
  ERROR: 'fas fa-exclamation-triangle',
  WARNING: 'fas fa-exclamation-circle',
} as const;

// 8 Essential Node Shapes with Professional Icons
export const NODE_SHAPES: Record<string, NodeShape> = {
  // 🟢 START - Perfect circle with play icon (triggers, webhooks, manual)
  START: {
    name: 'Start',
    shape: 'circle',
    icon: NODE_ICONS.TRIGGER,
    backgroundColor: 'linear-gradient(135deg, #4CAF50, #66BB6A)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
    hoverColor: 'linear-gradient(135deg, #388E3C, #4CAF50)',
    selectedColor: 'linear-gradient(135deg, #2E7D32, #388E3C)',
    runningColor: 'linear-gradient(135deg, #FFC107, #FFD54F)',
    textColor: '#ffffff'
  },

  // 🟦 PROCESS - Rounded rectangle with cog icon (tasks, transformations)
  PROCESS: {
    name: 'Process',
    shape: 'rounded-rectangle',
    icon: NODE_ICONS.PROCESS,
    backgroundColor: 'linear-gradient(135deg, #2196F3, #42A5F5)',
    borderColor: 'rgba(33, 150, 243, 0.3)',
    hoverColor: 'linear-gradient(135deg, #1976D2, #2196F3)',
    selectedColor: 'linear-gradient(135deg, #1565C0, #1976D2)',
    runningColor: 'linear-gradient(135deg, #FFC107, #FFD54F)',
    textColor: '#ffffff'
  },

  // 🟡 DECISION - Diamond with question icon (conditions, if statements)
  DECISION: {
    name: 'Decision',
    shape: 'diamond',
    icon: NODE_ICONS.DECISION,
    backgroundColor: 'linear-gradient(135deg, #FF9800, #FFB74D)',
    borderColor: 'rgba(255, 152, 0, 0.3)',
    hoverColor: 'linear-gradient(135deg, #F57C00, #FF9800)',
    selectedColor: 'linear-gradient(135deg, #EF6C00, #F57C00)',
    runningColor: 'linear-gradient(135deg, #4CAF50, #66BB6A)',
    textColor: '#ffffff'
  },

  // ⚡ API - More rounded rectangle with bolt icon (HTTP, AI calls)
  API: {
    name: 'API',
    shape: 'super-rounded',
    icon: NODE_ICONS.API,
    backgroundColor: 'linear-gradient(135deg, #9C27B0, #BA68C8)',
    borderColor: 'rgba(156, 39, 176, 0.3)',
    hoverColor: 'linear-gradient(135deg, #7B1FA2, #9C27B0)',
    selectedColor: 'linear-gradient(135deg, #6A1B9A, #7B1FA2)',
    runningColor: 'linear-gradient(135deg, #FFC107, #FFD54F)',
    textColor: '#ffffff'
  },

  // ✉️ MESSAGE - Envelope shape with comments icon (communications)
  MESSAGE: {
    name: 'Message',
    shape: 'envelope',
    icon: NODE_ICONS.MESSAGE,
    backgroundColor: 'linear-gradient(135deg, #607D8B, #78909C)',
    borderColor: 'rgba(96, 125, 139, 0.3)',
    hoverColor: 'linear-gradient(135deg, #455A64, #607D8B)',
    selectedColor: 'linear-gradient(135deg, #37474F, #455A64)',
    runningColor: 'linear-gradient(135deg, #FFC107, #FFD54F)',
    textColor: '#ffffff'
  },

  // 🗄️ DATABASE - Cylinder shape with database icon (data storage)
  DATABASE: {
    name: 'Database',
    shape: 'cylinder',
    icon: NODE_ICONS.DATABASE,
    backgroundColor: 'linear-gradient(180deg, #795548, #8D6E63)',
    borderColor: 'rgba(121, 85, 72, 0.3)',
    hoverColor: 'linear-gradient(180deg, #5D4037, #795548)',
    selectedColor: 'linear-gradient(180deg, #4E342E, #5D4037)',
    runningColor: 'linear-gradient(135deg, #FFC107, #FFD54F)',
    textColor: '#ffffff'
  },

  // ✅ SUCCESS - Circle with border and check icon (completions)
  SUCCESS: {
    name: 'Success',
    shape: 'circle-border',
    icon: NODE_ICONS.SUCCESS,
    backgroundColor: 'linear-gradient(135deg, #4CAF50, #388E3C)',
    borderColor: 'rgba(76, 175, 80, 0.5)',
    hoverColor: 'linear-gradient(135deg, #388E3C, #2E7D32)',
    selectedColor: 'linear-gradient(135deg, #2E7D32, #1B5E20)',
    runningColor: 'linear-gradient(135deg, #FFC107, #FFD54F)',
    textColor: '#ffffff'
  },

  // ⚠️ ERROR - Triangle with exclamation icon (error handling)
  ERROR: {
    name: 'Error',
    shape: 'triangle',
    icon: NODE_ICONS.ERROR,
    backgroundColor: 'linear-gradient(135deg, #F44336, #EF5350)',
    borderColor: 'rgba(244, 67, 54, 0.3)',
    hoverColor: 'linear-gradient(135deg, #D32F2F, #F44336)',
    selectedColor: 'linear-gradient(135deg, #C62828, #D32F2F)',
    runningColor: 'linear-gradient(135deg, #FFC107, #FFD54F)',
    textColor: '#ffffff'
  }
};

// Extended icon mapping for specific node types
export const EXTENDED_NODE_ICONS = {
  // Trigger types
  webhook: NODE_ICONS.WEBHOOK,
  manual: NODE_ICONS.TRIGGER,
  schedule: NODE_ICONS.SCHEDULE,
  email_trigger: NODE_ICONS.EMAIL,
  
  // Process types
  code_execution: NODE_ICONS.CODE,
  data_transform: NODE_ICONS.TRANSFORM,
  basic_task: NODE_ICONS.PROCESS,
  
  // API types
  http_request: NODE_ICONS.HTTP,
  rest_api: NODE_ICONS.REST,
  graphql: NODE_ICONS.API,
  
  // AI types
  ai_agent: NODE_ICONS.AI,
  openai_gpt: NODE_ICONS.OPENAI,
  machine_learning: NODE_ICONS.ML,
  
  // Database types
  database_query: NODE_ICONS.DATABASE,
  data_storage: NODE_ICONS.STORAGE,
  cache_operation: NODE_ICONS.CACHE,
  
  // Communication types
  send_message: NODE_ICONS.MESSAGE,
  slack_notification: NODE_ICONS.SLACK,
  discord_message: NODE_ICONS.DISCORD,
  
  // Result types
  success_end: NODE_ICONS.SUCCESS,
  error_handler: NODE_ICONS.ERROR,
  warning_alert: NODE_ICONS.WARNING,
} as const;

// Mapping from node types to shapes
export const getNodeShape = (nodeType: string): string => {
  const typeMap: Record<string, string> = {
    // Triggers
    webhook: 'START',
    manual: 'START', 
    schedule: 'START',
    email_trigger: 'START',
    
    // Processing
    code_execution: 'PROCESS',
    data_transform: 'PROCESS',
    basic_task: 'PROCESS',
    
    // Decision making
    if_condition: 'DECISION',
    switch_case: 'DECISION',
    filter: 'DECISION',
    
    // API calls
    http_request: 'API',
    rest_api: 'API',
    graphql: 'API',
    
    // AI operations
    ai_agent: 'API',
    openai_gpt: 'API',
    machine_learning: 'API',
    
    // Communication
    send_email: 'MESSAGE',
    send_message: 'MESSAGE',
    slack_notification: 'MESSAGE',
    
    // Data storage
    database_query: 'DATABASE',
    save_data: 'DATABASE',
    load_data: 'DATABASE',
    
    // Results
    success: 'SUCCESS',
    error: 'ERROR',
    warning: 'ERROR'
  };
  
  return typeMap[nodeType] || 'PROCESS';
};

// Get icon for specific node type
export const getNodeIcon = (nodeType: string): string => {
  return EXTENDED_NODE_ICONS[nodeType as keyof typeof EXTENDED_NODE_ICONS] || NODE_ICONS.PROCESS;
};

// Helper function to get complete node style
export const getNodeStyle = (nodeType: string, state: 'base' | 'hover' | 'selected' | 'running' = 'base') => {
  const shapeKey = getNodeShape(nodeType);
  const shape = NODE_SHAPES[shapeKey];
  const icon = getNodeIcon(nodeType);
  
  let backgroundColor = shape.backgroundColor;
  
  switch (state) {
    case 'hover':
      backgroundColor = shape.hoverColor;
      break;
    case 'selected':
      backgroundColor = shape.selectedColor;
      break;
    case 'running':
      backgroundColor = shape.runningColor;
      break;
  }
  
  return {
    shape: shape.shape,
    icon,
    backgroundColor,
    borderColor: shape.borderColor,
    textColor: shape.textColor,
    boxShadow: `0 4px 15px ${shape.borderColor}`
  };
};

export default NODE_SHAPES; 