/**
 * Enhanced Chat Settings Component
 * Comprehensive chat settings modal with behavior customization and file handling
 */

import React, { useState } from 'react';
import {
  Settings,
  X,
  MessageCircle,
  Bot,
  Users,
  Database,
  Shield,
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
  Brain,
  Upload,
  FileText
} from 'lucide-react';
import config from '../../../config';

interface SimpleChatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  conversation?: any;
  onSettingsChange?: (settings: any) => void;
}

const mockChildAgents = [
  {
    id: 'child-1',
    name: 'Code Assistant',
    type: 'Programming',
    status: 'active',
    chat_endpoint: '/chat/child-agent/child-1',
    chat_url: '/chat/child-agent/child-1'
  },
  {
    id: 'child-2',
    name: 'Data Analyst',
    type: 'Analytics',
    status: 'active',
    chat_endpoint: '/chat/child-agent/child-2',
    chat_url: '/chat/child-agent/child-2'
  }
];

export const SimpleChatSettings: React.FC<SimpleChatSettingsProps> = ({
  isOpen,
  onClose,
  conversation,
  onSettingsChange
}) => {
  console.log('SimpleChatSettings rendered with isOpen:', isOpen);
  
  const [activeTab, setActiveTab] = useState('general');
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');

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

  if (!isOpen) {
    console.log('SimpleChatSettings: isOpen is false, returning null');
    return null;
  }

  console.log('SimpleChatSettings: About to render modal');

  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(2px)',
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      width: '90%',
      maxWidth: '800px',
      maxHeight: '90vh',
      overflow: 'hidden',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
      border: '1px solid #e9ecef',
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
      marginBottom: '28px',
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
    infoBox: {
      padding: '12px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#495057',
      marginBottom: '16px',
    },
    settingItem: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
      marginBottom: '20px',
    },
    settingLabel: {
      fontSize: '14px',
      color: '#495057',
      fontWeight: '500',
    },
    settingDescription: {
      fontSize: '12px',
      color: '#6c757d',
      marginBottom: '8px',
    },
    inputField: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #e9ecef',
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: 'white',
      boxSizing: 'border-box' as const,
    },
    textareaField: {
      width: '100%',
      height: '120px',
      padding: '12px',
      border: '1px solid #e9ecef',
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'monospace',
      resize: 'vertical' as const,
      backgroundColor: '#f8f9fa',
      boxSizing: 'border-box' as const,
    },
    rangeSlider: {
      width: '100%',
      height: '6px',
      backgroundColor: '#e9ecef',
      borderRadius: '3px',
      outline: 'none',
      appearance: 'none' as const,
    },
    checkboxGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px',
      marginTop: '8px',
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px',
      cursor: 'pointer',
    },
    checkbox: {
      width: '16px',
      height: '16px',
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
      backgroundColor: '#d4edda',
      color: '#155724',
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
      backgroundColor: 'white',
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
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'behavior', label: 'Chat Behavior', icon: MessageCircle },
    { id: 'files', label: 'Files & Uploads', icon: Upload },
    { id: 'agents', label: 'Child Agents', icon: Users },
    { id: 'advanced', label: 'Advanced', icon: Database },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div style={styles.tabContent}>
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <Settings size={16} />
                General Settings
              </h3>
              
              <div style={styles.infoBox}>
                <Info size={14} style={{ float: 'left', marginRight: '8px' }} />
                Basic settings for your chat experience.
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>Auto Save</div>
                <div style={styles.settingDescription}>Conversations are automatically saved</div>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" defaultChecked={true} style={styles.checkbox} />
                  Enable auto-save
                </label>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>AI Learning</div>
                <div style={styles.settingDescription}>AI learns from conversations to improve responses</div>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" defaultChecked={true} style={styles.checkbox} />
                  Enable AI learning
                </label>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>Conversation Encryption</div>
                <div style={styles.settingDescription}>Encrypt sensitive conversations</div>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" defaultChecked={false} style={styles.checkbox} />
                  Enable encryption
                </label>
              </div>
            </div>
          </div>
        );

      case 'behavior':
        return (
          <div style={styles.tabContent}>
            {/* Chat Personality Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <MessageCircle size={16} />
                Chat Personality
              </h3>
              
              <div style={styles.infoBox}>
                <Info size={14} style={{ float: 'left', marginRight: '8px' }} />
                Customize how the AI assistant interacts with you. These settings affect the tone and style of responses.
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>Assistant Personality</div>
                <div style={styles.settingDescription}>Choose how the AI should behave in conversations</div>
                <select 
                  style={styles.inputField}
                  onChange={(e) => onSettingsChange?.({ personality: e.target.value })}
                >
                  <option value="professional">Professional & Formal</option>
                  <option value="friendly">Friendly & Casual</option>
                  <option value="expert">Technical Expert</option>
                  <option value="creative">Creative & Inspiring</option>
                  <option value="teacher">Patient Teacher</option>
                </select>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>Custom System Prompt</div>
                <div style={styles.settingDescription}>Define exactly how you want the AI to behave and respond</div>
                <textarea
                  style={styles.textareaField}
                  placeholder="You are a helpful AI assistant. You should always be polite, accurate, and provide detailed explanations. When asked about code, provide working examples..."
                  value={systemPrompt}
                  onChange={(e) => {
                    setSystemPrompt(e.target.value);
                    onSettingsChange?.({ systemPrompt: e.target.value });
                  }}
                />
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>Response Style</div>
                <div style={styles.settingDescription}>How the AI structures its responses</div>
                <select 
                  style={styles.inputField}
                  onChange={(e) => onSettingsChange?.({ responseStyle: e.target.value })}
                >
                  <option value="concise">Concise & Direct</option>
                  <option value="detailed">Detailed & Explanatory</option>
                  <option value="conversational">Conversational & Engaging</option>
                  <option value="technical">Technical & Precise</option>
                </select>
              </div>
            </div>

            {/* AI Parameters Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <Brain size={16} />
                AI Parameters
              </h3>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>
                  Temperature: <span style={{color: '#667eea', fontWeight: 'bold'}}>{temperature}</span>
                </div>
                <div style={styles.settingDescription}>Controls creativity (0.0 = focused, 1.0 = creative)</div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  style={styles.rangeSlider}
                />
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>Max Response Length</div>
                <div style={styles.settingDescription}>Maximum tokens in AI responses</div>
                <select style={styles.inputField}>
                  <option value="500">Short (500 tokens)</option>
                  <option value="1000">Medium (1000 tokens)</option>
                  <option value="2000">Long (2000 tokens)</option>
                  <option value="4000">Very Long (4000 tokens)</option>
                </select>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>Context Memory</div>
                <div style={styles.settingDescription}>How much conversation history to remember</div>
                <select style={styles.inputField}>
                  <option value="10">Last 10 messages</option>
                  <option value="25">Last 25 messages</option>
                  <option value="50">Last 50 messages</option>
                  <option value="full">Entire conversation</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'files':
        return (
          <div style={styles.tabContent}>
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <Upload size={16} />
                File Upload Settings
              </h3>
              
              <div style={styles.infoBox}>
                <FileText size={14} style={{ float: 'left', marginRight: '8px' }} />
                Configure how files are handled in your conversations. Upload documents, images, and code files.
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>Allowed File Types</div>
                <div style={styles.settingDescription}>Select which file types can be uploaded</div>
                <div style={styles.checkboxGrid}>
                  {[
                    {type: 'pdf', label: 'PDF Documents'},
                    {type: 'txt', label: 'Text Files'},
                    {type: 'docx', label: 'Word Documents'},
                    {type: 'xlsx', label: 'Excel Files'},
                    {type: 'images', label: 'Images (JPG, PNG)'},
                    {type: 'code', label: 'Code Files'},
                    {type: 'json', label: 'JSON Files'},
                    {type: 'csv', label: 'CSV Files'}
                  ].map((fileType) => (
                    <label key={fileType.type} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        style={styles.checkbox}
                      />
                      {fileType.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>Max File Size</div>
                <div style={styles.settingDescription}>Maximum size per file upload</div>
                <select style={styles.inputField}>
                  <option value="5">5 MB</option>
                  <option value="10">10 MB</option>
                  <option value="25">25 MB</option>
                  <option value="50">50 MB</option>
                  <option value="100">100 MB</option>
                </select>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>File Processing</div>
                <div style={styles.settingDescription}>How uploaded files should be processed</div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <label style={styles.checkboxLabel}>
                    <input type="checkbox" defaultChecked={true} style={styles.checkbox} />
                    Auto-extract text from documents
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input type="checkbox" defaultChecked={true} style={styles.checkbox} />
                    Analyze image content
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input type="checkbox" defaultChecked={false} style={styles.checkbox} />
                    Store files permanently
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input type="checkbox" defaultChecked={true} style={styles.checkbox} />
                    Generate file summaries
                  </label>
                </div>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>Upload Folder</div>
                <div style={styles.settingDescription}>Where to save uploaded files</div>
                <input
                  type="text"
                  defaultValue="./uploads/"
                  style={styles.inputField}
                  placeholder="Enter folder path"
                />
              </div>
            </div>
          </div>
        );

      case 'agents':
        return (
          <div style={styles.tabContent}>
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <Users size={16} />
                Child Agents
              </h3>
              
              <div style={styles.infoBox}>
                <Bot size={14} style={{ float: 'left', marginRight: '8px' }} />
                Each child agent has its own specialized chat interface. Click to open their chat or copy their endpoint.
              </div>

              {mockChildAgents.map((agent) => (
                <div key={agent.id} style={styles.childAgentCard}>
                  <div style={styles.childAgentHeader}>
                    <div style={styles.childAgentName}>
                      <Bot size={16} />
                      {agent.name}
                    </div>
                    <div style={styles.statusBadge}>
                      {agent.status}
                    </div>
                  </div>

                  <div style={styles.settingDescription}>
                    Type: {agent.type}
                  </div>

                  <div style={styles.actionButtons}>
                    <button
                      style={{...styles.actionButton, ...styles.primaryButton}}
                      onClick={() => window.open(agent.chat_url, '_blank')}
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
          </div>
        );

      case 'advanced':
        return (
          <div style={styles.tabContent}>
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <Database size={16} />
                Technical Information
              </h3>
              
              <div style={styles.infoBox}>
                <AlertCircle size={14} style={{ float: 'left', marginRight: '8px' }} />
                Technical details for developers and advanced users.
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>Conversation ID</div>
                <div style={styles.settingDescription}>Unique identifier for this conversation</div>
                <div style={styles.codeBlock}>
                  {conversation?.id || 'conv-1234567890'}
                  <button
                    style={styles.copyCodeButton}
                    onClick={() => handleCopyToClipboard(conversation?.id || 'conv-1234567890', 'conv-id')}
                  >
                    {copiedItems.has('conv-id') ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>API Endpoint</div>
                <div style={styles.settingDescription}>REST API endpoint for this conversation</div>
                <div style={styles.codeBlock}>
                  /chat/conversations/{conversation?.id || 'conv-1234567890'}
                  <button
                    style={styles.copyCodeButton}
                    onClick={() => handleCopyToClipboard(`/chat/conversations/${conversation?.id || 'conv-1234567890'}`, 'api-endpoint')}
                  >
                    {copiedItems.has('api-endpoint') ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>WebSocket Endpoint</div>
                <div style={styles.settingDescription}>Real-time connection endpoint</div>
                <div style={styles.codeBlock}>
                  {`${config.websocket.url}/chat/${conversation?.id || 'conv-1234567890'}`}
                  <button
                    style={styles.copyCodeButton}
                    onClick={() => handleCopyToClipboard(`${config.websocket.url}/chat/${conversation?.id || 'conv-1234567890'}`, 'ws-endpoint')}
                  >
                    {copiedItems.has('ws-endpoint') ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>Direct Chat URL</div>
                <div style={styles.settingDescription}>Direct link to this conversation</div>
                <div style={styles.codeBlock}>
                  {window.location.origin}/chat/{conversation?.id || 'conv-1234567890'}
                  <button
                    style={styles.copyCodeButton}
                    onClick={() => handleCopyToClipboard(`${window.location.origin}/chat/${conversation?.id || 'conv-1234567890'}`, 'chat-url')}
                  >
                    {copiedItems.has('chat-url') ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingLabel}>Debug Mode</div>
                <div style={styles.settingDescription}>Enable detailed logging and debugging</div>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" defaultChecked={false} style={styles.checkbox} />
                  Enable debug logging
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
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

export default SimpleChatSettings; 