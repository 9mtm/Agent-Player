/**
 * Model Selector Component
 * Allows users to select and switch between different AI models
 */

import React, { useState } from 'react';
import {
  Brain,
  ChevronDown,
  Zap,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

interface ChatModel {
  id: string;
  name: string;
  provider: string;
  version: string;
  max_tokens: number;
  temperature: number;
  status: 'active' | 'inactive' | 'maintenance';
  cost_per_token: number;
  capabilities: string[];
  response_time: number;
  description: string;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  showModelInfo?: boolean;
}

const availableModels: ChatModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    version: '4.0',
    max_tokens: 8192,
    temperature: 0.7,
    status: 'active',
    cost_per_token: 0.00003,
    capabilities: ['reasoning', 'coding', 'analysis', 'creativity'],
    response_time: 2.1,
    description: 'Most capable model for complex reasoning and analysis'
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
    capabilities: ['conversation', 'basic_coding', 'writing'],
    response_time: 1.2,
    description: 'Fast and efficient for general conversations'
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
    capabilities: ['long_context', 'analysis', 'reasoning', 'safety'],
    response_time: 1.8,
    description: 'Excellent for long documents and careful analysis'
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    version: '4.0-turbo',
    max_tokens: 128000,
    temperature: 0.7,
    status: 'active',
    cost_per_token: 0.00001,
    capabilities: ['reasoning', 'coding', 'analysis', 'long_context'],
    response_time: 1.5,
    description: 'Faster GPT-4 with longer context window'
  }
];

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  disabled = false,
  showModelInfo = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const currentModel = availableModels.find(model => model.id === selectedModel) || availableModels[0];

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#28a745';
      case 'inactive':
        return '#dc3545';
      case 'maintenance':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  const styles = {
    container: {
      position: 'relative' as const,
      display: 'inline-block',
    },
    selector: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: 'white',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      minWidth: '200px',
      transition: 'all 0.2s ease',
      opacity: disabled ? 0.6 : 1,
    },
    selectorHover: {
      borderColor: '#667eea',
      boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.1)',
    },
    modelIcon: {
      padding: '4px',
      backgroundColor: '#667eea',
      color: 'white',
      borderRadius: '4px',
    },
    modelInfo: {
      flex: 1,
      minWidth: 0,
    },
    modelName: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#2c3e50',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    modelProvider: {
      fontSize: '11px',
      color: '#6c757d',
    },
    statusIndicator: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: getStatusColor(currentModel.status),
    },
    chevron: {
      transition: 'transform 0.2s ease',
      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    },
    dropdown: {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: 'white',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      marginTop: '4px',
      maxHeight: '400px',
      overflowY: 'auto' as const,
    },
    modelOption: {
      padding: '12px',
      borderBottom: '1px solid #f8f9fa',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    },
    modelOptionHover: {
      backgroundColor: '#f8f9fa',
    },
    modelOptionSelected: {
      backgroundColor: '#f0f8ff',
      borderLeft: '3px solid #667eea',
    },
    optionHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '4px',
    },
    optionName: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#2c3e50',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    optionProvider: {
      fontSize: '11px',
      color: '#6c757d',
      padding: '1px 4px',
      backgroundColor: '#f8f9fa',
      borderRadius: '3px',
    },
    optionDescription: {
      fontSize: '12px',
      color: '#6c757d',
      marginBottom: '6px',
    },
    optionSpecs: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '8px',
      fontSize: '11px',
      color: '#6c757d',
    },
    specItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    capabilities: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '4px',
      marginTop: '6px',
    },
    capability: {
      padding: '2px 6px',
      backgroundColor: '#e3f2fd',
      color: '#1976d2',
      borderRadius: '4px',
      fontSize: '9px',
      fontWeight: '500',
    },
    infoPanel: {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: 'white',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      marginTop: '4px',
    },
    infoHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '12px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#2c3e50',
    },
    infoContent: {
      fontSize: '12px',
      color: '#495057',
      lineHeight: '1.4',
    },
    infoSpecs: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginTop: '12px',
      paddingTop: '12px',
      borderTop: '1px solid #f1f3f4',
    },
    infoSpec: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '11px',
      color: '#6c757d',
    },
    historyNote: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginTop: '12px',
      padding: '8px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      fontSize: '11px',
      color: '#495057',
    },
  };

  return (
    <div style={styles.container}>
      <div
        style={styles.selector}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onMouseEnter={() => !disabled && setShowInfo(showModelInfo)}
        onMouseLeave={() => setShowInfo(false)}
      >
        <div style={styles.modelIcon}>
          <Brain size={14} />
        </div>
        
        <div style={styles.modelInfo}>
          <div style={styles.modelName}>
            {currentModel.name}
            <div style={styles.statusIndicator} />
          </div>
          <div style={styles.modelProvider}>
            {currentModel.provider} • {currentModel.version}
          </div>
        </div>
        
        <ChevronDown size={14} style={styles.chevron} />
      </div>

      {isOpen && !disabled && (
        <div style={styles.dropdown}>
          {availableModels.map((model) => (
            <div
              key={model.id}
              style={{
                ...styles.modelOption,
                ...(model.id === selectedModel ? styles.modelOptionSelected : {})
              }}
              onClick={() => handleModelSelect(model.id)}
            >
              <div style={styles.optionHeader}>
                <div style={styles.optionName}>
                  {model.name}
                  <div style={{
                    ...styles.statusIndicator,
                    backgroundColor: getStatusColor(model.status)
                  }} />
                </div>
                <div style={styles.optionProvider}>
                  {model.provider}
                </div>
              </div>
              
              <div style={styles.optionDescription}>
                {model.description}
              </div>
              
              <div style={styles.optionSpecs}>
                <div style={styles.specItem}>
                  <Zap size={10} />
                  {model.max_tokens.toLocaleString()} tokens
                </div>
                <div style={styles.specItem}>
                  <Clock size={10} />
                  ~{model.response_time}s response
                </div>
                <div style={styles.specItem}>
                  <DollarSign size={10} />
                  ${model.cost_per_token}/token
                </div>
                <div style={styles.specItem}>
                  {model.status === 'active' ? (
                    <CheckCircle size={10} color="#28a745" />
                  ) : (
                    <AlertCircle size={10} color="#dc3545" />
                  )}
                  {model.status}
                </div>
              </div>
              
              <div style={styles.capabilities}>
                {model.capabilities.map((capability, index) => (
                  <span key={index} style={styles.capability}>
                    {capability.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showInfo && showModelInfo && !isOpen && (
        <div style={styles.infoPanel}>
          <div style={styles.infoHeader}>
            <Brain size={16} />
            {currentModel.name} Model Info
          </div>
          
          <div style={styles.infoContent}>
            {currentModel.description}
          </div>
          
          <div style={styles.infoSpecs}>
            <div style={styles.infoSpec}>
              <Zap size={12} />
              Max Tokens: {currentModel.max_tokens.toLocaleString()}
            </div>
            <div style={styles.infoSpec}>
              <Clock size={12} />
              Response Time: ~{currentModel.response_time}s
            </div>
            <div style={styles.infoSpec}>
              <DollarSign size={12} />
              Cost: ${currentModel.cost_per_token}/token
            </div>
            <div style={styles.infoSpec}>
              <CheckCircle size={12} color={getStatusColor(currentModel.status)} />
              Status: {currentModel.status}
            </div>
          </div>
          
          <div style={styles.historyNote}>
            <Info size={12} />
            Switching models will preserve your conversation history
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector; 