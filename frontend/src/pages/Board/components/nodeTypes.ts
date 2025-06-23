// Node types definition for the board (modular, easy to extend)
export interface NodeTypeDef {
  type: string;
  label: string;
  color: string;
  icon: string; // FontAwesome icon class instead of emoji
  category: string;
  description?: string;
  badge?: string;
}

export const NODE_TYPES: NodeTypeDef[] = [
  {
    type: "task",
    label: "Task",
    color: "#4a90e2",
    icon: "fas fa-cog",
    category: "Logic",
    description: "General task or step in your workflow.",
  },
  {
    type: "condition",
    label: "Condition",
    color: "#f5a623",
    icon: "fas fa-question",
    category: "Logic",
    description: "Branch the flow based on conditions.",
  },
  {
    type: "action",
    label: "Action",
    color: "#7ed957",
    icon: "fas fa-check-circle",
    category: "Logic",
    description: "Perform an action or trigger an event.",
    badge: "Popular",
  },
  {
    type: "http",
    label: "HTTP Request",
    color: "#0077cc",
    icon: "fas fa-bolt",
    category: "Core",
    description: "Send HTTP requests to external services.",
  },
  {
    type: "webhook",
    label: "Webhook",
    color: "#8e44ad",
    icon: "fas fa-play",
    category: "Core",
    description: "Receive data from external systems.",
    badge: "Recommended",
  },
  {
    type: "ai",
    label: "AI Prompt",
    color: "#ff5e57",
    icon: "fas fa-robot",
    category: "AI",
    description: "Interact with AI models and prompts.",
    badge: "New",
  },
  {
    type: "AI-agent",
    label: "AI Agent",
    color: "#6c47ff",
    icon: "fas fa-robot",
    category: "AI",
    description:
      "A sub-agent that can execute delegated tasks from the main AI Agent.",
    badge: "Beta",
  },
  {
    type: "OpenAI-Agent",
    label: "OpenAI Agent",
    color: "#6c47ff",
    icon: "fas fa-brain",
    category: "AI",
    description:
      "Message an assistant or GPT, analyze images, generate audio, etc.",
    badge: "Beta",
  },
  {
    type: "note",
    label: "Sticky Note",
    color: "#ffe066",
    icon: "fas fa-sticky-note",
    category: "UI",
    description: "Add notes or comments to your board.",
  },
  {
    type: "execute-sub-workflow",
    label: "Execute Sub-workflow",
    color: "#ff7043",
    icon: "fas fa-project-diagram",
    category: "Core",
    description:
      "Helpers for calling other workflows. Used for modular, microservice-like workflows.",
  },
  {
    type: "execution-data",
    label: "Execution Data",
    color: "#00bcd4",
    icon: "fas fa-database",
    category: "Core",
    description: "Add execution data for search.",
  },
  {
    type: "ftp",
    label: "FTP",
    color: "#7986cb",
    icon: "fas fa-upload",
    category: "Core",
    description: "Transfer files via FTP or SFTP.",
  },

  {
    type: "Dpro-form",
    label: "Dpro Form",
    color: "#26a69a",
    icon: "fas fa-wpforms",
    category: "Core",
    description:
      "Generate webforms in Dpro and pass their responses to the workflow.",
  },
  {
    type: "no-operation",
    label: "No Operation",
    color: "#bdbdbd",
    icon: "fas fa-ban",
    category: "Core",
    description: "No Operation.",
  },
  {
    type: "respond-to-webhook",
    label: "Respond to Webhook",
    color: "#8e44ad",
    icon: "fas fa-reply",
    category: "Core",
    description: "Returns data for Webhook.",
  },
  {
    type: "wait",
    label: "Wait",
    color: "#ab47bc",
    icon: "fas fa-clock",
    category: "Core",
    description: "Wait before continue with execution.",
  },
  {
    type: "flow",
    label: "Flow",
    color: "#42a5f5",
    icon: "fas fa-stream",
    category: "Core",
    description: "Control the flow of your automation or workflow.",
  },
  {
    type: "if",
    label: "If",
    color: "#43a047",
    icon: "fas fa-question-circle",
    category: "Flow",
    description: "Route items to different branches (true/false)",
  },
  {
    type: "loop-batch",
    label: "Loop Over Items",
    color: "#26c6da",
    icon: "fas fa-redo",
    category: "Flow",
    description: "Split data into batches and iterate over each batch",
  },
  {
    type: "merge",
    label: "Merge",
    color: "#00bcd4",
    icon: "fas fa-code-branch",
    category: "Flow",
    description:
      "Merges data of multiple streams once data from both is available",
  },
  {
    type: "compare-datasets",
    label: "Compare Datasets",
    color: "#43e047",
    icon: "fas fa-not-equal",
    category: "Flow",
    description: "Compare two inputs for changes",
  },
  {
    type: "execute-sub-workflow",
    label: "Execute Sub-workflow",
    color: "#ff7043",
    icon: "fas fa-project-diagram",
    category: "Flow",
    description:
      "Helpers for calling other workflows. Used for modular, microservice-like workflows.",
  },
  {
    type: "stop-error",
    label: "Stop and Error",
    color: "#e53935",
    icon: "fas fa-exclamation-triangle",
    category: "Flow",
    description: "Throw an error in the workflow",
  },
  {
    type: "switch",
    label: "Switch",
    color: "#42a5f5",
    icon: "fas fa-random",
    category: "Flow",
    description: "Route items depending on defined expression or rules",
  },
  {
    type: "wait-flow",
    label: "Wait",
    color: "#ab47bc",
    icon: "fas fa-pause",
    category: "Flow",
    description: "Wait before continue with execution",
  },
  {
    type: "filter",
    label: "Filter",
    color: "#00bfae",
    icon: "fas fa-filter",
    category: "Flow",
    description: "Filter items based on conditions or rules.",
  },
  {
    type: "discord",
    label: "Discord",
    color: "#5865F2",
    icon: "fab fa-discord",
    category: "Communication",
    description: "Send and wait for response via Discord.",
  },
  {
    type: "gmail",
    label: "Gmail",
    color: "#EA4335",
    icon: "fab fa-google",
    category: "Communication",
    description: "Send and wait for response via Gmail.",
  },
  {
    type: "google-chat",
    label: "Google Chat",
    color: "#34A853",
    icon: "fab fa-google",
    category: "Communication",
    description: "Send and wait for response via Google Chat.",
  },
  {
    type: "microsoft-outlook",
    label: "Microsoft Outlook",
    color: "#0072C6",
    icon: "fab fa-microsoft",
    category: "Communication",
    description: "Send and wait for response via Microsoft Outlook.",
  },
  {
    type: "microsoft-teams",
    label: "Microsoft Teams",
    color: "#6264A7",
    icon: "fab fa-microsoft",
    category: "Communication",
    description: "Send and wait for response via Microsoft Teams.",
  },
  {
    type: "send-email",
    label: "Send Email",
    color: "#43A047",
    icon: "fas fa-envelope",
    category: "Communication",
    description: "Send and wait for response via Email.",
  },
  {
    type: "slack",
    label: "Slack",
    color: "#4A154B",
    icon: "fab fa-slack",
    category: "Communication",
    description: "Send and wait for response via Slack.",
  },
  {
    type: "telegram",
    label: "Telegram",
    color: "#0088cc",
    icon: "fab fa-telegram",
    category: "Communication",
    description: "Send and wait for response via Telegram.",
  },
  {
    type: "whatsapp-business-cloud",
    label: "WhatsApp Business",
    color: "#25D366",
    icon: "fab fa-whatsapp",
    category: "Communication",
    description: "Send and wait for response via WhatsApp Business Cloud.",
  },
  {
    type: "ai-transform",
    label: "AI Transform",
    color: "#a259f7",
    icon: "fas fa-magic",
    category: "Data",
    description: "Modify data based on instructions written in plain english",
  },
  {
    type: "code-transform",
    label: "Code",
    color: "#f39c12",
    icon: "fas fa-code",
    category: "Data",
    description: "Run custom JavaScript or Python code",
  },
  {
    type: "date-time",
    label: "Date & Time",
    color: "#27ae60",
    icon: "fas fa-calendar",
    category: "Data",
    description: "Manipulate date and time values",
  },
  {
    type: "edit-fields",
    label: "Edit Fields",
    color: "#6c47ff",
    icon: "fas fa-edit",
    category: "Data",
    description: "Modify, add, or remove item fields",
  },
  {
    type: "filter-transform",
    label: "Filter",
    color: "#00bfae",
    icon: "fas fa-filter",
    category: "Data",
    description: "Remove items matching a condition",
  },
  {
    type: "limit",
    label: "Limit",
    color: "#009688",
    icon: "fas fa-stop",
    category: "Data",
    description: "Restrict the number of items",
  },
  {
    type: "remove-duplicates",
    label: "Remove Duplicates",
    color: "#e74c3c",
    icon: "fas fa-copy",
    category: "Data",
    description: "Delete items with matching field values",
  },
  {
    type: "split-out",
    label: "Split Out",
    color: "#9b59b6",
    icon: "fas fa-cut",
    category: "Data",
    description: "Turn a list inside item(s) into separate items",
  },
  {
    type: "aggregate",
    label: "Aggregate",
    color: "#e67e22",
    icon: "fas fa-plus-circle",
    category: "Data",
    description: "Combine a field from many items into a list in a single item",
  },
  {
    type: "summarize",
    label: "Summarize",
    color: "#f4d03f",
    icon: "fas fa-chart-bar",
    category: "Data",
    description: "Sum, count, max, etc. across items",
  },
  {
    type: "compression",
    label: "Compression",
    color: "#27ae60",
    icon: "fas fa-file-archive",
    category: "Data",
    description: "Compress and decompress files",
  },
  {
    type: "convert-to-file",
    label: "Convert to File",
    color: "#8e44ad",
    icon: "fas fa-file-export",
    category: "Data",
    description: "Convert JSON data to binary data",
  },
  {
    type: "crypto",
    label: "Crypto",
    color: "#16a085",
    icon: "fas fa-key",
    category: "Data",
    description: "Provide cryptographic utilities",
  },
  {
    type: "edit-image",
    label: "Edit Image",
    color: "#9b59b6",
    icon: "fas fa-image",
    category: "Data",
    description: "Edits an image like blur, resize or adding border and text",
  },
  {
    type: "extract-from-file",
    label: "Extract from File",
    color: "#5dade2",
    icon: "fas fa-file-import",
    category: "Data",
    description: "Convert binary data to JSON",
  },
  {
    type: "html",
    label: "HTML",
    color: "#e67e22",
    icon: "fab fa-html5",
    category: "Data",
    description: "Work with HTML",
  },
  {
    type: "markdown",
    label: "Markdown",
    color: "#95a5a6",
    icon: "fab fa-markdown",
    category: "Data",
    description: "Convert data between Markdown and HTML",
  },
  {
    type: "xml",
    label: "XML",
    color: "#6c47ff",
    icon: "fas fa-code",
    category: "Data",
    description: "Convert data from and to XML",
  },
  {
    type: "rename-keys",
    label: "Rename Keys",
    color: "#e57373",
    icon: "fas fa-i-cursor",
    category: "Data",
    description: "Update item field names",
  },
  {
    type: "sort",
    label: "Sort",
    color: "#42a5f5",
    icon: "fas fa-sort",
    category: "Data",
    description: "Change items order",
  },
  {
    type: "merge-data-transformation",
    label: "Merge",
    color: "#00bcd4",
    icon: "fas fa-compress-arrows-alt",
    category: "Data",
    description:
      "Merges data of multiple streams once data from both is available",
  },
  {
    type: "facebook",
    label: "Facebook",
    color: "#1877f3",
    icon: "fab fa-facebook",
    category: "Social",
    description: "Interact with Facebook APIs and features.",
  },
  {
    type: "linkedin",
    label: "LinkedIn",
    color: "#0077b5",
    icon: "fab fa-linkedin",
    category: "Social",
    description: "Interact with LinkedIn APIs and features.",
  },
  {
    type: "twitter",
    label: "Twitter",
    color: "#1da1f2",
    icon: "fab fa-twitter",
    category: "Social",
    description: "Interact with Twitter APIs and features.",
  },
  {
    type: "instagram",
    label: "Instagram",
    color: "#E4405F",
    icon: "fab fa-instagram",
    category: "Social",
    description: "Interact with Instagram APIs and features.",
  },
  {
    type: "youtube",
    label: "YouTube",
    color: "#ff0000",
    icon: "fab fa-youtube",
    category: "Action in an app",
    description: "Interact with YouTube APIs and features.",
  },
  {
    type: "tiktok",
    label: "TikTok",
    color: "#010101",
    icon: "fab fa-tiktok",
    category: "Action in an app",
    description: "Interact with TikTok APIs and features.",
  },
  {
    type: "pinterest",
    label: "Pinterest",
    color: "#e60023",
    icon: "fab fa-pinterest",
    category: "Action in an app",
    description: "Interact with Pinterest APIs and features.",
  },
  {
    type: "snapchat",
    label: "Snapchat",
    color: "#fffc00",
    icon: "fab fa-snapchat",
    category: "Action in an app",
    description: "Interact with Snapchat APIs and features.",
  },
  // Add more node types as needed
];

// Enhanced Node Types for Advanced Workflow System
export interface BaseNodeData {
  id: string;
  type: string;
  x: number;
  y: number;
  label: string;
  width?: number;
  height?: number;
  data?: Record<string, unknown>;
  isStartNode?: boolean;
  triggerType?: string;
  executionState?: NodeExecutionState;
  category?: string;
  icon?: string;
  color?: string;
  description?: string;
  inputs?: NodePort[];
  outputs?: NodePort[];
  settings?: NodeSettings;
}

export interface NodePort {
  id: string;
  label: string;
  type: 'input' | 'output';
  dataType?: string;
  required?: boolean;
  connected?: boolean;
}

export interface NodeSettings {
  [key: string]: unknown;
  timeout?: number;
  retries?: number;
  parallel?: boolean;
  condition?: string;
}

export interface NodeExecutionState {
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'error' | 'paused';
  startTime?: Date;
  endTime?: Date;
  progress?: number; // 0-100
  error?: string;
  output?: unknown;
  logs?: string[];
}

// Enhanced node type definitions
export const ENHANCED_NODE_TYPES = {
  // Trigger Nodes
  TRIGGER: {
    manual: {
      category: 'triggers',
      label: 'Manual Trigger',
      icon: '🖱️',
      color: '#667eea',
      description: 'Start workflow manually by user action',
      shape: 'circle',
      width: 80,
      height: 80,
      inputs: [],
      outputs: [{ id: 'output', label: 'Start', type: 'output', dataType: 'trigger' }]
    },
    chat: {
      category: 'triggers',
      label: 'Chat Trigger',
      icon: '💬',
      color: '#28a745',
      description: 'Triggered by chat messages or conversations',
      shape: 'circle',
      width: 80,
      height: 80,
      inputs: [],
      outputs: [{ id: 'output', label: 'Message', type: 'output', dataType: 'text' }]
    },
    email: {
      category: 'triggers',
      label: 'Email Trigger',
      icon: '📧',
      color: '#dc3545',
      description: 'Triggered by incoming emails',
      shape: 'circle',
      width: 80,
      height: 80,
      inputs: [],
      outputs: [{ id: 'output', label: 'Email', type: 'output', dataType: 'email' }]
    },
    webhook: {
      category: 'triggers',
      label: 'Webhook Trigger',
      icon: '🔗',
      color: '#fd7e14',
      description: 'Triggered by HTTP webhook calls',
      shape: 'circle',
      width: 80,
      height: 80,
      inputs: [],
      outputs: [{ id: 'output', label: 'Data', type: 'output', dataType: 'json' }]
    },
    schedule: {
      category: 'triggers',
      label: 'Schedule Trigger',
      icon: '⏰',
      color: '#6610f2',
      description: 'Triggered by time-based schedule',
      shape: 'circle',
      width: 80,
      height: 80,
      inputs: [],
      outputs: [{ id: 'output', label: 'Time', type: 'output', dataType: 'datetime' }]
    }
  },

  // Processing Nodes
  PROCESS: {
    task: {
      category: 'processing',
      label: 'Task Processor',
      icon: '⚙️',
      color: '#2196f3',
      description: 'Process and transform data',
      shape: 'rectangle',
      width: 120,
      height: 60,
      inputs: [{ id: 'input', label: 'Data', type: 'input', dataType: 'any' }],
      outputs: [{ id: 'output', label: 'Result', type: 'output', dataType: 'any' }]
    },
    transform: {
      category: 'processing',
      label: 'Data Transform',
      icon: '🔄',
      color: '#17a2b8',
      description: 'Transform data between formats',
      shape: 'rectangle',
      width: 120,
      height: 60,
      inputs: [{ id: 'input', label: 'Raw Data', type: 'input', dataType: 'any' }],
      outputs: [{ id: 'output', label: 'Transformed', type: 'output', dataType: 'any' }]
    },
    filter: {
      category: 'processing',
      label: 'Filter Data',
      icon: '🔍',
      color: '#ffc107',
      description: 'Filter data based on conditions',
      shape: 'rectangle',
      width: 120,
      height: 60,
      inputs: [{ id: 'input', label: 'Data', type: 'input', dataType: 'array' }],
      outputs: [{ id: 'output', label: 'Filtered', type: 'output', dataType: 'array' }]
    },
    validate: {
      category: 'processing',
      label: 'Validate Data',
      icon: '✅',
      color: '#28a745',
      description: 'Validate data against schema',
      shape: 'rectangle',
      width: 120,
      height: 60,
      inputs: [{ id: 'input', label: 'Data', type: 'input', dataType: 'any' }],
      outputs: [
        { id: 'valid', label: 'Valid', type: 'output', dataType: 'any' },
        { id: 'invalid', label: 'Invalid', type: 'output', dataType: 'error' }
      ]
    }
  },

  // Decision Nodes
  DECISION: {
    condition: {
      category: 'logic',
      label: 'Condition Check',
      icon: '❓',
      color: '#ff9800',
      description: 'Make decisions based on conditions',
      shape: 'diamond',
      width: 100,
      height: 100,
      inputs: [{ id: 'input', label: 'Data', type: 'input', dataType: 'any' }],
      outputs: [
        { id: 'true', label: 'True', type: 'output', dataType: 'any' },
        { id: 'false', label: 'False', type: 'output', dataType: 'any' }
      ]
    },
    switch: {
      category: 'logic',
      label: 'Switch Case',
      icon: '🔀',
      color: '#e83e8c',
      description: 'Route data based on multiple conditions',
      shape: 'diamond',
      width: 100,
      height: 100,
      inputs: [{ id: 'input', label: 'Value', type: 'input', dataType: 'any' }],
      outputs: [
        { id: 'case1', label: 'Case 1', type: 'output', dataType: 'any' },
        { id: 'case2', label: 'Case 2', type: 'output', dataType: 'any' },
        { id: 'default', label: 'Default', type: 'output', dataType: 'any' }
      ]
    }
  },

  // AI Agent Nodes
  AGENT: {
    'ai-chat': {
      category: 'ai',
      label: 'AI Chat Agent',
      icon: '🤖',
      color: '#9c27b0',
      description: 'AI agent for chat interactions',
      shape: 'agent',
      width: 140,
      height: 80,
      inputs: [{ id: 'message', label: 'Message', type: 'input', dataType: 'text' }],
      outputs: [{ id: 'response', label: 'Response', type: 'output', dataType: 'text' }],
      tools: ['chat', 'memory', 'context']
    },
    'ai-vision': {
      category: 'ai',
      label: 'AI Vision Agent',
      icon: '👁️',
      color: '#673ab7',
      description: 'AI agent for image analysis',
      shape: 'agent',
      width: 140,
      height: 80,
      inputs: [{ id: 'image', label: 'Image', type: 'input', dataType: 'image' }],
      outputs: [{ id: 'analysis', label: 'Analysis', type: 'output', dataType: 'json' }],
      tools: ['vision', 'detection', 'ocr']
    },
    'ai-code': {
      category: 'ai',
      label: 'AI Code Agent',
      icon: '💻',
      color: '#3f51b5',
      description: 'AI agent for code generation and analysis',
      shape: 'agent',
      width: 140,
      height: 80,
      inputs: [{ id: 'prompt', label: 'Prompt', type: 'input', dataType: 'text' }],
      outputs: [{ id: 'code', label: 'Code', type: 'output', dataType: 'code' }],
      tools: ['code-gen', 'debug', 'analyze']
    }
  },

  // Integration Nodes
  INTEGRATION: {
    'api-call': {
      category: 'integration',
      label: 'API Call',
      icon: '🌐',
      color: '#607d8b',
      description: 'Make HTTP API requests',
      shape: 'rectangle',
      width: 120,
      height: 60,
      inputs: [{ id: 'params', label: 'Parameters', type: 'input', dataType: 'json' }],
      outputs: [{ id: 'response', label: 'Response', type: 'output', dataType: 'json' }]
    },
    database: {
      category: 'integration',
      label: 'Database Query',
      icon: '🗄️',
      color: '#795548',
      description: 'Query database systems',
      shape: 'rectangle',
      width: 120,
      height: 60,
      inputs: [{ id: 'query', label: 'Query', type: 'input', dataType: 'sql' }],
      outputs: [{ id: 'results', label: 'Results', type: 'output', dataType: 'array' }]
    },
    'file-ops': {
      category: 'integration',
      label: 'File Operations',
      icon: '📁',
      color: '#ff5722',
      description: 'Read/write files and documents',
      shape: 'rectangle',
      width: 120,
      height: 60,
      inputs: [{ id: 'path', label: 'File Path', type: 'input', dataType: 'string' }],
      outputs: [{ id: 'content', label: 'Content', type: 'output', dataType: 'any' }]
    }
  },

  // Flow Control Nodes
  FLOW: {
    delay: {
      category: 'flow',
      label: 'Delay',
      icon: '⏱️',
      color: '#9e9e9e',
      description: 'Add delay to workflow execution',
      shape: 'rectangle',
      width: 100,
      height: 50,
      inputs: [{ id: 'input', label: 'Data', type: 'input', dataType: 'any' }],
      outputs: [{ id: 'output', label: 'Data', type: 'output', dataType: 'any' }]
    },
    parallel: {
      category: 'flow',
      label: 'Parallel Split',
      icon: '🔀',
      color: '#4caf50',
      description: 'Execute multiple branches in parallel',
      shape: 'triangle',
      width: 100,
      height: 80,
      inputs: [{ id: 'input', label: 'Data', type: 'input', dataType: 'any' }],
      outputs: [
        { id: 'branch1', label: 'Branch 1', type: 'output', dataType: 'any' },
        { id: 'branch2', label: 'Branch 2', type: 'output', dataType: 'any' }
      ]
    },
    merge: {
      category: 'flow',
      label: 'Merge Data',
      icon: '🔗',
      color: '#00bcd4',
      description: 'Merge multiple data sources',
      shape: 'merge',
      width: 100,
      height: 80,
      inputs: [
        { id: 'input1', label: 'Input 1', type: 'input', dataType: 'any' },
        { id: 'input2', label: 'Input 2', type: 'input', dataType: 'any' }
      ],
      outputs: [{ id: 'output', label: 'Merged', type: 'output', dataType: 'any' }]
    },
    loop: {
      category: 'flow',
      label: 'Loop',
      icon: '🔄',
      color: '#ff9800',
      description: 'Execute nodes in a loop',
      shape: 'rectangle',
      width: 100,
      height: 60,
      inputs: [{ id: 'items', label: 'Items', type: 'input', dataType: 'array' }],
      outputs: [{ id: 'item', label: 'Current Item', type: 'output', dataType: 'any' }]
    }
  },

  // Output Nodes
  OUTPUT: {
    response: {
      category: 'output',
      label: 'Response',
      icon: '📤',
      color: '#4caf50',
      description: 'Send response back to user',
      shape: 'rectangle',
      width: 120,
      height: 60,
      inputs: [{ id: 'data', label: 'Response Data', type: 'input', dataType: 'any' }],
      outputs: []
    },
    notification: {
      category: 'output',
      label: 'Send Notification',
      icon: '🔔',
      color: '#ff9800',
      description: 'Send notifications to users',
      shape: 'rectangle',
      width: 120,
      height: 60,
      inputs: [{ id: 'message', label: 'Message', type: 'input', dataType: 'text' }],
      outputs: []
    },
    save: {
      category: 'output',
      label: 'Save Data',
      icon: '💾',
      color: '#607d8b',
      description: 'Save data to storage',
      shape: 'rectangle',
      width: 120,
      height: 60,
      inputs: [{ id: 'data', label: 'Data to Save', type: 'input', dataType: 'any' }],
      outputs: [{ id: 'saved', label: 'Saved', type: 'output', dataType: 'boolean' }]
    }
  }
};

// Get all node types organized by category
export function getNodeTypesByCategory() {
  const categories = {
    triggers: ENHANCED_NODE_TYPES.TRIGGER,
    processing: ENHANCED_NODE_TYPES.PROCESS,
    logic: ENHANCED_NODE_TYPES.DECISION,
    ai: ENHANCED_NODE_TYPES.AGENT,
    integration: ENHANCED_NODE_TYPES.INTEGRATION,
    flow: ENHANCED_NODE_TYPES.FLOW,
    output: ENHANCED_NODE_TYPES.OUTPUT
  };

  return categories;
}

// Get node configuration by type
export function getNodeConfig(nodeType: string): NodeConfigType | null {
  const allTypes = Object.values(ENHANCED_NODE_TYPES);
  for (const category of allTypes) {
    const nodeConfig = (category as Record<string, NodeConfigType>)[nodeType];
    if (nodeConfig) {
      return nodeConfig;
    }
  }
  return null;
}

// Type for node configuration
interface NodeConfigType {
  category: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  shape: string;
  width: number;
  height: number;
  inputs: NodePort[];
  outputs: NodePort[];
  tools?: string[];
}

// Create a new node instance
export function createNodeInstance(nodeType: string, x: number, y: number, customData?: Record<string, unknown>): BaseNodeData {
  const config = getNodeConfig(nodeType);
  
  if (!config) {
    throw new Error(`Unknown node type: ${nodeType}`);
  }

  const id = `${nodeType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    type: nodeType,
    x,
    y,
    label: config.label,
    width: config.width || 120,
    height: config.height || 60,
    data: {
      ...config,
      ...customData
    },
    icon: config.icon,
    color: config.color,
    category: config.category,
    description: config.description,
    inputs: config.inputs || [],
    outputs: config.outputs || [],
    executionState: {
      status: 'idle',
      progress: 0
    }
  };
}

// Workflow validation helpers
export function validateWorkflow(nodes: BaseNodeData[], edges: EdgeType[]) {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for start nodes
  const startNodes = nodes.filter(node => 
    node.category === 'triggers' || node.isStartNode
  );

  if (startNodes.length === 0) {
    errors.push('Workflow must have at least one trigger node');
  } else if (startNodes.length > 1) {
    warnings.push('Multiple trigger nodes found - only one will be executed');
  }

  // Check for orphaned nodes
  const connectedNodes = new Set();
  edges.forEach(edge => {
    connectedNodes.add(edge.from);
    connectedNodes.add(edge.to);
  });

  const orphanedNodes = nodes.filter(node => 
    !connectedNodes.has(node.id) && nodes.length > 1
  );

  if (orphanedNodes.length > 0) {
    warnings.push(`${orphanedNodes.length} nodes are not connected`);
  }

  // Check for missing required inputs
  for (const node of nodes) {
    const requiredInputs = node.inputs?.filter(input => input.required) || [];
    const nodeEdges = edges.filter(edge => edge.to === node.id);
    
    for (const input of requiredInputs) {
      const hasConnection = nodeEdges.some(edge => edge.toPort === input.id);
      if (!hasConnection) {
        warnings.push(`Node ${node.label} is missing required input: ${input.label}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Edge type for validation
interface EdgeType {
  from: string;
  to: string;
  toPort?: string;
}

// Export for backward compatibility
export type BoardNodeData = BaseNodeData;
