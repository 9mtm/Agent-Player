/**
 * Chat Settings Component
 * Comprehensive chat settings with multiple tabs and configurations
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  MessageCircle,
  Bot,
  Users,
  Link,
  Info,
  Database,
  Network,
  Lock,
  Brain,
  Globe,
  Clock,
  Shield,
  Zap,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface ChatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  conversation?: any;
  selectedAgent?: any;
  onSettingsChange?: (settings: any) => void;
}

interface ChildAgent {
  id: string;
  name: string;
  type: string;
  model: string;
  status: 'active' | 'inactive' | 'busy';
  connected: boolean;
  chat_endpoint: string;
  created_at: string;
  last_activity: string;
  capabilities: string[];
  performance_metrics: {
    response_time: number;
    accuracy: number;
    engagement: number;
  };
}

interface ChatModel {
  id: string;
  name: string;
  provider: string;
  version: string;
  max_tokens: number;
  temperature: number;
  status: 'active' | 'inactive';
  cost_per_token: number;
  capabilities: string[];
}

const mockChildAgents: ChildAgent[] = [
  {
    id: 'child-1',
    name: 'Code Assistant',
    type: 'Programming',
    model: 'GPT-4-Code',
    status: 'active',
    connected: true,
    chat_endpoint: '/chat/child-agent/child-1',
    created_at: '2024-01-15T10:30:00Z',
    last_activity: '2024-01-20T14:22:00Z',
    capabilities: ['code_generation', 'debugging', 'optimization'],
    performance_metrics: {
      response_time: 1.2,
      accuracy: 0.95,
      engagement: 0.88
    }
  },
  {
    id: 'child-2',
    name: 'Data Analyst',
    type: 'Analytics',
    model: 'GPT-4-Analytics',
    status: 'active',
    connected: true,
    chat_endpoint: '/chat/child-agent/child-2',
    created_at: '2024-01-10T09:15:00Z',
    last_activity: '2024-01-20T13:45:00Z',
    capabilities: ['data_analysis', 'visualization', 'insights'],
    performance_metrics: {
      response_time: 1.8,
      accuracy: 0.92,
      engagement: 0.85
    }
  },
  {
    id: 'child-3',
    name: 'Creative Writer',
    type: 'Content',
    model: 'GPT-4-Creative',
    status: 'inactive',
    connected: false,
    chat_endpoint: '/chat/child-agent/child-3',
    created_at: '2024-01-05T16:20:00Z',
    last_activity: '2024-01-18T11:30:00Z',
    capabilities: ['creative_writing', 'content_creation', 'storytelling'],
    performance_metrics: {
      response_time: 2.1,
      accuracy: 0.89,
      engagement: 0.92
    }
  }
];

const mockChatModels: ChatModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    version: '4.0',
    max_tokens: 8192,
    temperature: 0.7,
    status: 'active',
    cost_per_token: 0.00003,
    capabilities: ['text_generation', 'reasoning', 'coding', 'analysis']
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    version: '3.5',
    max_tokens: 4096,
    temperature: 0.7,
    status: 'active',
    cost_per_token: 0.000002,
    capabilities: ['text_generation', 'conversation', 'basic_coding']
  },
  {
    id: 'claude-3',
    name: 'Claude 3',
    provider: 'Anthropic',
    version: '3.0',
    max_tokens: 200000,
    temperature: 0.7,
    status: 'active',
    cost_per_token: 0.000015,
    capabilities: ['text_generation', 'analysis', 'reasoning', 'long_context']
  }
];

export const ChatSettings: React.FC<ChatSettingsProps> = ({
  isOpen,
  onClose,
  conversation,
  selectedAgent,
  onSettingsChange
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      auto_save: true,
      ai_learning_enabled: true,
      conversation_backup: true,
      notification_enabled: true,
      theme: 'light',
      language: 'en'
    },
    model: {
      selected_model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      maintain_history: true
    },
    agents: {
      primary_agent: selectedAgent?.id || 1,
      child_agents_enabled: true,
      auto_delegate: true,
      agent_switching: true,
      collaborative_mode: false
    },
    advanced: {
      api_endpoint: '/chat/conversations',
      websocket_endpoint: 'ws://localhost:8000/ws/chat',
      timeout: 30000,
      retry_attempts: 3,
      encryption_enabled: true,
      audit_logging: true
    },
    privacy: {
      data_retention: 30,
      share_analytics: false,
      encrypt_messages: true,
      anonymize_data: false,
      third_party_sharing: false
    }
  });

  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    
    if (onSettingsChange) {
      onSettingsChange({ ...settings, [category]: { ...settings[category], [key]: value } });
    }
  };

  const handleCopyToClipboard = (text: string, item: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItems(prev => new Set([...prev, item]));
    setTimeout(() => {
      setCopiedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item);
        return newSet;
      });
    }, 2000);
  };

  const getChildAgentChatUrl = (childAgent: ChildAgent) => {
    return `${window.location.origin}/chat/child-agent/${childAgent.id}`;
  };

  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      width: '90%',
      maxWidth: '800px',
      maxHeight: '90vh',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    },
    header: {
      padding: '20px',
      borderBottom: '1px solid #e9ecef',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#f8f9fa',
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#2c3e50',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '6px',
      color: '#6c757d',
      transition: 'all 0.2s ease',
    },
    content: {
      display: 'flex',
      height: '600px',
    },
    sidebar: {
      width: '220px',
      borderRight: '1px solid #e9ecef',
      backgroundColor: '#f8f9fa',
      padding: '20px 0',
    },
    tabButton: {
      width: '100%',
      padding: '12px 20px',
      border: 'none',
      background: 'none',
      textAlign: 'left' as const,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '14px',
      color: '#495057',
      transition: 'all 0.2s ease',
    },
    tabButtonActive: {
      backgroundColor: '#667eea',
      color: 'white',
    },
    tabContent: {
      flex: 1,
      padding: '20px',
      overflowY: 'auto' as const,
    },
    section: {
      marginBottom: '24px',
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    settingItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: '1px solid #f1f3f4',
    },
    settingLabel: {
      fontSize: '14px',
      color: '#495057',
      fontWeight: '500',
    },
    settingDescription: {
      fontSize: '12px',
      color: '#6c757d',
      marginTop: '2px',
    },
    toggleSwitch: {
      position: 'relative' as const,
      width: '44px',
      height: '24px',
      backgroundColor: '#dee2e6',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    toggleSwitchActive: {
      backgroundColor: '#667eea',
    },
    toggleHandle: {
      position: 'absolute' as const,
      top: '2px',
      left: '2px',
      width: '20px',
      height: '20px',
      backgroundColor: 'white',
      borderRadius: '50%',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    toggleHandleActive: {
      transform: 'translateX(20px)',
    },
    select: {
      padding: '8px 12px',
      border: '1px solid #e9ecef',
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: 'white',
      color: '#495057',
      minWidth: '120px',
    },
    input: {
      padding: '8px 12px',
      border: '1px solid #e9ecef',
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: 'white',
      color: '#495057',
      minWidth: '120px',
    },
    childAgentCard: {
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      backgroundColor: 'white',
    },
    childAgentHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px',
    },
    childAgentName: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2c3e50',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '10px',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
    },
    statusActive: {
      backgroundColor: '#d4edda',
      color: '#155724',
    },
    statusInactive: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
    },
    statusBusy: {
      backgroundColor: '#fff3cd',
      color: '#856404',
    },
    childAgentDetails: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '8px',
      fontSize: '12px',
      color: '#6c757d',
      marginBottom: '12px',
    },
    detailItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    actionButtons: {
      display: 'flex',
      gap: '8px',
    },
    actionButton: {
      padding: '6px 12px',
      border: '1px solid #e9ecef',
      borderRadius: '6px',
      fontSize: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    primaryButton: {
      backgroundColor: '#667eea',
      color: 'white',
      border: '1px solid #667eea',
    },
    copyButton: {
      backgroundColor: '#28a745',
      color: 'white',
      border: '1px solid #28a745',
    },
    infoBox: {
      padding: '12px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#495057',
      marginBottom: '16px',
    },
    codeBlock: {
      backgroundColor: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '6px',
      padding: '12px',
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#495057',
      marginBottom: '8px',
      wordBreak: 'break-all' as const,
      position: 'relative' as const,
    },
    copyCodeButton: {
      position: 'absolute' as const,
      top: '8px',
      right: '8px',
      padding: '4px 8px',
      backgroundColor: '#667eea',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '10px',
      cursor: 'pointer',
    },
    modelCard: {
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      backgroundColor: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    modelCardSelected: {
      borderColor: '#667eea',
      backgroundColor: '#f8f9ff',
    },
    modelHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '8px',
    },
    modelName: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2c3e50',
    },
    modelProvider: {
      fontSize: '12px',
      color: '#6c757d',
      padding: '2px 6px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
    },
    modelSpecs: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '8px',
      fontSize: '12px',
      color: '#6c757d',
      marginBottom: '8px',
    },
    capabilities: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '4px',
    },
    capability: {
      padding: '2px 6px',
      backgroundColor: '#e3f2fd',
      color: '#1976d2',
      borderRadius: '4px',
      fontSize: '10px',
    },
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'model', label: 'AI Model', icon: Brain },
    { id: 'agents', label: 'Child Agents', icon: Users },
    { id: 'advanced', label: 'Advanced', icon: Database },
    { id: 'privacy', label: 'Privacy', icon: Shield },
  ];

  const renderGeneralTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <Settings size={16} />
          General Settings
        </h3>
        
        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Auto Save</div>
            <div style={styles.settingDescription}>Automatically save conversation changes</div>
          </div>
          <div 
            style={{
              ...styles.toggleSwitch,
              ...(settings.general.auto_save ? styles.toggleSwitchActive : {})
            }}
            onClick={() => handleSettingChange('general', 'auto_save', !settings.general.auto_save)}
          >
            <div style={{
              ...styles.toggleHandle,
              ...(settings.general.auto_save ? styles.toggleHandleActive : {})
            }} />
          </div>
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>AI Learning</div>
            <div style={styles.settingDescription}>Allow AI to learn from this conversation</div>
          </div>
          <div 
            style={{
              ...styles.toggleSwitch,
              ...(settings.general.ai_learning_enabled ? styles.toggleSwitchActive : {})
            }}
            onClick={() => handleSettingChange('general', 'ai_learning_enabled', !settings.general.ai_learning_enabled)}
          >
            <div style={{
              ...styles.toggleHandle,
              ...(settings.general.ai_learning_enabled ? styles.toggleHandleActive : {})
            }} />
          </div>
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Conversation Backup</div>
            <div style={styles.settingDescription}>Create automatic backups of conversations</div>
          </div>
          <div 
            style={{
              ...styles.toggleSwitch,
              ...(settings.general.conversation_backup ? styles.toggleSwitchActive : {})
            }}
            onClick={() => handleSettingChange('general', 'conversation_backup', !settings.general.conversation_backup)}
          >
            <div style={{
              ...styles.toggleHandle,
              ...(settings.general.conversation_backup ? styles.toggleHandleActive : {})
            }} />
          </div>
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Theme</div>
            <div style={styles.settingDescription}>Choose your preferred theme</div>
          </div>
          <select 
            style={styles.select}
            value={settings.general.theme}
            onChange={(e) => handleSettingChange('general', 'theme', e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderModelTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <Brain size={16} />
          AI Model Selection
        </h3>
        
        <div style={styles.infoBox}>
          <Info size={14} style={{ float: 'left', marginRight: '8px' }} />
          When you change the model, conversation history will be maintained and accessible to the new model.
        </div>

        {mockChatModels.map((model) => (
          <div
            key={model.id}
            style={{
              ...styles.modelCard,
              ...(settings.model.selected_model === model.id ? styles.modelCardSelected : {})
            }}
            onClick={() => handleSettingChange('model', 'selected_model', model.id)}
          >
            <div style={styles.modelHeader}>
              <div style={styles.modelName}>{model.name}</div>
              <div style={styles.modelProvider}>{model.provider}</div>
            </div>
            
            <div style={styles.modelSpecs}>
              <div>Max Tokens: {model.max_tokens.toLocaleString()}</div>
              <div>Cost: ${model.cost_per_token}/token</div>
              <div>Version: {model.version}</div>
              <div>Status: {model.status}</div>
            </div>
            
            <div style={styles.capabilities}>
              {model.capabilities.map((cap, index) => (
                <span key={index} style={styles.capability}>
                  {cap.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <Zap size={16} />
          Model Parameters
        </h3>
        
        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Temperature</div>
            <div style={styles.settingDescription}>Controls randomness (0.0 - 2.0)</div>
          </div>
          <input
            type="number"
            min="0"
            max="2"
            step="0.1"
            style={styles.input}
            value={settings.model.temperature}
            onChange={(e) => handleSettingChange('model', 'temperature', parseFloat(e.target.value))}
          />
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Max Tokens</div>
            <div style={styles.settingDescription}>Maximum response length</div>
          </div>
          <input
            type="number"
            min="1"
            max="8192"
            style={styles.input}
            value={settings.model.max_tokens}
            onChange={(e) => handleSettingChange('model', 'max_tokens', parseInt(e.target.value))}
          />
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Maintain History</div>
            <div style={styles.settingDescription}>Keep conversation history when switching models</div>
          </div>
          <div 
            style={{
              ...styles.toggleSwitch,
              ...(settings.model.maintain_history ? styles.toggleSwitchActive : {})
            }}
            onClick={() => handleSettingChange('model', 'maintain_history', !settings.model.maintain_history)}
          >
            <div style={{
              ...styles.toggleHandle,
              ...(settings.model.maintain_history ? styles.toggleHandleActive : {})
            }} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAgentsTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <Users size={16} />
          Child Agents
        </h3>
        
        <div style={styles.infoBox}>
          <Bot size={14} style={{ float: 'left', marginRight: '8px' }} />
          Each child agent has its own specialized chat interface and capabilities. You can connect to them directly.
        </div>

        {mockChildAgents.map((agent) => (
          <div key={agent.id} style={styles.childAgentCard}>
            <div style={styles.childAgentHeader}>
              <div style={styles.childAgentName}>
                <Bot size={16} />
                {agent.name}
              </div>
              <div style={{
                ...styles.statusBadge,
                ...(agent.status === 'active' ? styles.statusActive : 
                    agent.status === 'inactive' ? styles.statusInactive : styles.statusBusy)
              }}>
                {agent.status}
              </div>
            </div>

            <div style={styles.childAgentDetails}>
              <div style={styles.detailItem}>
                <Brain size={12} />
                Model: {agent.model}
              </div>
              <div style={styles.detailItem}>
                <Network size={12} />
                {agent.connected ? 'Connected' : 'Disconnected'}
              </div>
              <div style={styles.detailItem}>
                <Clock size={12} />
                Response: {agent.performance_metrics.response_time}s
              </div>
              <div style={styles.detailItem}>
                <CheckCircle size={12} />
                Accuracy: {Math.round(agent.performance_metrics.accuracy * 100)}%
              </div>
            </div>

            <div>
              <strong>Capabilities:</strong>
              <div style={styles.capabilities}>
                {agent.capabilities.map((cap, index) => (
                  <span key={index} style={styles.capability}>
                    {cap.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div style={styles.actionButtons}>
              <button
                style={{...styles.actionButton, ...styles.primaryButton}}
                onClick={() => window.open(getChildAgentChatUrl(agent), '_blank')}
              >
                <MessageCircle size={12} />
                Open Chat
              </button>
              <button
                style={{
                  ...styles.actionButton,
                  ...(copiedItems.has(`endpoint-${agent.id}`) ? styles.copyButton : {})
                }}
                onClick={() => handleCopyToClipboard(agent.chat_endpoint, `endpoint-${agent.id}`)}
              >
                {copiedItems.has(`endpoint-${agent.id}`) ? <CheckCircle size={12} /> : <Copy size={12} />}
                {copiedItems.has(`endpoint-${agent.id}`) ? 'Copied!' : 'Copy Endpoint'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <Settings size={16} />
          Agent Settings
        </h3>
        
        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Enable Child Agents</div>
            <div style={styles.settingDescription}>Allow child agents to participate in conversations</div>
          </div>
          <div 
            style={{
              ...styles.toggleSwitch,
              ...(settings.agents.child_agents_enabled ? styles.toggleSwitchActive : {})
            }}
            onClick={() => handleSettingChange('agents', 'child_agents_enabled', !settings.agents.child_agents_enabled)}
          >
            <div style={{
              ...styles.toggleHandle,
              ...(settings.agents.child_agents_enabled ? styles.toggleHandleActive : {})
            }} />
          </div>
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Auto Delegate</div>
            <div style={styles.settingDescription}>Automatically delegate tasks to specialized agents</div>
          </div>
          <div 
            style={{
              ...styles.toggleSwitch,
              ...(settings.agents.auto_delegate ? styles.toggleSwitchActive : {})
            }}
            onClick={() => handleSettingChange('agents', 'auto_delegate', !settings.agents.auto_delegate)}
          >
            <div style={{
              ...styles.toggleHandle,
              ...(settings.agents.auto_delegate ? styles.toggleHandleActive : {})
            }} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <Database size={16} />
          Technical Information
        </h3>
        
        <div style={styles.infoBox}>
          <AlertCircle size={14} style={{ float: 'left', marginRight: '8px' }} />
          These are technical details for advanced users and developers.
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Conversation ID</div>
            <div style={styles.settingDescription}>Unique identifier for this conversation</div>
          </div>
          <div style={styles.codeBlock}>
            {conversation?.id || 'N/A'}
            <button
              style={styles.copyCodeButton}
              onClick={() => handleCopyToClipboard(conversation?.id || '', 'conv-id')}
            >
              {copiedItems.has('conv-id') ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>API Endpoint</div>
            <div style={styles.settingDescription}>REST API endpoint for this conversation</div>
          </div>
          <div style={styles.codeBlock}>
            {settings.advanced.api_endpoint}/{conversation?.id}
            <button
              style={styles.copyCodeButton}
              onClick={() => handleCopyToClipboard(`${settings.advanced.api_endpoint}/${conversation?.id}`, 'api-endpoint')}
            >
              {copiedItems.has('api-endpoint') ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>WebSocket Endpoint</div>
            <div style={styles.settingDescription}>Real-time connection endpoint</div>
          </div>
          <div style={styles.codeBlock}>
            {settings.advanced.websocket_endpoint}/{conversation?.id}
            <button
              style={styles.copyCodeButton}
              onClick={() => handleCopyToClipboard(`${settings.advanced.websocket_endpoint}/${conversation?.id}`, 'ws-endpoint')}
            >
              {copiedItems.has('ws-endpoint') ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Direct Chat URL</div>
            <div style={styles.settingDescription}>Direct link to this conversation</div>
          </div>
          <div style={styles.codeBlock}>
            {window.location.origin}/chat/{conversation?.id}
            <button
              style={styles.copyCodeButton}
              onClick={() => handleCopyToClipboard(`${window.location.origin}/chat/${conversation?.id}`, 'chat-url')}
            >
              {copiedItems.has('chat-url') ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <Network size={16} />
          Connection Settings
        </h3>
        
        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Request Timeout</div>
            <div style={styles.settingDescription}>Timeout for API requests (ms)</div>
          </div>
          <input
            type="number"
            min="5000"
            max="60000"
            step="1000"
            style={styles.input}
            value={settings.advanced.timeout}
            onChange={(e) => handleSettingChange('advanced', 'timeout', parseInt(e.target.value))}
          />
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Retry Attempts</div>
            <div style={styles.settingDescription}>Number of retry attempts on failure</div>
          </div>
          <input
            type="number"
            min="0"
            max="10"
            style={styles.input}
            value={settings.advanced.retry_attempts}
            onChange={(e) => handleSettingChange('advanced', 'retry_attempts', parseInt(e.target.value))}
          />
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Encryption</div>
            <div style={styles.settingDescription}>Enable end-to-end encryption</div>
          </div>
          <div 
            style={{
              ...styles.toggleSwitch,
              ...(settings.advanced.encryption_enabled ? styles.toggleSwitchActive : {})
            }}
            onClick={() => handleSettingChange('advanced', 'encryption_enabled', !settings.advanced.encryption_enabled)}
          >
            <div style={{
              ...styles.toggleHandle,
              ...(settings.advanced.encryption_enabled ? styles.toggleHandleActive : {})
            }} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <Shield size={16} />
          Privacy & Security
        </h3>
        
        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Data Retention</div>
            <div style={styles.settingDescription}>How long to keep conversation data (days)</div>
          </div>
          <select 
            style={styles.select}
            value={settings.privacy.data_retention}
            onChange={(e) => handleSettingChange('privacy', 'data_retention', parseInt(e.target.value))}
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
            <option value={-1}>Forever</option>
          </select>
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Encrypt Messages</div>
            <div style={styles.settingDescription}>Encrypt all messages in storage</div>
          </div>
          <div 
            style={{
              ...styles.toggleSwitch,
              ...(settings.privacy.encrypt_messages ? styles.toggleSwitchActive : {})
            }}
            onClick={() => handleSettingChange('privacy', 'encrypt_messages', !settings.privacy.encrypt_messages)}
          >
            <div style={{
              ...styles.toggleHandle,
              ...(settings.privacy.encrypt_messages ? styles.toggleHandleActive : {})
            }} />
          </div>
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>Share Analytics</div>
            <div style={styles.settingDescription}>Share anonymized analytics for improvement</div>
          </div>
          <div 
            style={{
              ...styles.toggleSwitch,
              ...(settings.privacy.share_analytics ? styles.toggleSwitchActive : {})
            }}
            onClick={() => handleSettingChange('privacy', 'share_analytics', !settings.privacy.share_analytics)}
          >
            <div style={{
              ...styles.toggleHandle,
              ...(settings.privacy.share_analytics ? styles.toggleHandleActive : {})
            }} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralTab();
      case 'model':
        return renderModelTab();
      case 'agents':
        return renderAgentsTab();
      case 'advanced':
        return renderAdvancedTab();
      case 'privacy':
        return renderPrivacyTab();
      default:
        return renderGeneralTab();
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            <Settings size={20} />
            Chat Settings
          </h2>
          <button style={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div style={styles.content}>
          <div style={styles.sidebar}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                style={{
                  ...styles.tabButton,
                  ...(activeTab === tab.id ? styles.tabButtonActive : {})
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
          
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default ChatSettings; 