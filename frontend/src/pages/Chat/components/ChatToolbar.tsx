/**
 * Chat Toolbar Component - OpenAI Style
 * Top toolbar with model selection, settings, and controls
 */

import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, Bot, Settings, Zap } from 'lucide-react';

interface SimpleAgent {
  id: number;
  name: string;
  description?: string;
  model_name: string;
  model_provider?: string;
  is_active?: boolean;
}

interface ChatToolbarProps {
  selectedAgent: SimpleAgent | null;
  availableAgents: SimpleAgent[];
  onModelSelect: (agent: SimpleAgent) => void;
  onSettingsOpen: () => void;
  conversationTitle?: string;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const ChatToolbar: React.FC<ChatToolbarProps> = ({
  selectedAgent,
  availableAgents,
  onModelSelect,
  onSettingsOpen,
  conversationTitle,
  onToggleSidebar,
  isSidebarOpen
}) => {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getModelDisplayInfo = (agent: SimpleAgent) => {
    const provider = agent.model_provider || 'unknown';
    const isLocal = provider === 'local' || agent.model_name?.includes('ollama') || agent.model_name?.includes('llama');
    
    return {
      displayName: agent.name,
      modelInfo: isLocal ? `${agent.model_name} (Local)` : `${agent.model_name} (${provider})`,
      icon: isLocal ? '🖥️' : provider === 'openai' ? '🤖' : provider === 'anthropic' ? '🧠' : '⚡',
      badge: isLocal ? 'Local' : provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Claude' : 'AI'
    };
  };

  const currentModelInfo = selectedAgent ? getModelDisplayInfo(selectedAgent) : null;

  return (
    <div className="openai-toolbar">
      <div className="openai-toolbar-left">
        {/* Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className="openai-sidebar-toggle"
          title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          <Menu size={20} />
        </button>

        {/* Conversation Title */}
        {conversationTitle && (
          <div className="text-lg font-semibold text-gray-900 truncate">
            {conversationTitle}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Model Selector */}
        <div className="openai-model-selector" ref={dropdownRef}>
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className="openai-model-btn"
          >
            {currentModelInfo ? (
              <>
                <span className="text-lg">{currentModelInfo.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{currentModelInfo.displayName}</div>
                  <div className="text-xs text-gray-500">{currentModelInfo.modelInfo}</div>
                </div>
              </>
            ) : (
              <>
                <Bot size={16} />
                <span>Select Model</span>
              </>
            )}
            <ChevronDown 
              size={16} 
              className={`transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Model Dropdown */}
          {isModelDropdownOpen && (
            <div className="openai-model-dropdown">
              <div className="p-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-1">Available AI Models</h3>
                <p className="text-sm text-gray-500">Choose the AI model for your conversation</p>
              </div>
              
              {availableAgents.map((agent) => {
                const modelInfo = getModelDisplayInfo(agent);
                const isSelected = selectedAgent?.id === agent.id;
                
                return (
                  <div
                    key={agent.id}
                    onClick={() => {
                      onModelSelect(agent);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`openai-model-option ${isSelected ? 'active' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{modelInfo.icon}</span>
                      <div className="flex-1">
                        <div className="openai-model-name">{modelInfo.displayName}</div>
                        <div className="openai-model-info">{modelInfo.modelInfo}</div>
                        {agent.description && (
                          <div className="text-xs text-gray-400 mt-1">{agent.description}</div>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        modelInfo.badge === 'Local' 
                          ? 'bg-green-100 text-green-700'
                          : modelInfo.badge === 'OpenAI'
                          ? 'bg-blue-100 text-blue-700'
                          : modelInfo.badge === 'Claude'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {modelInfo.badge}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {availableAgents.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  <Bot size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No AI models available</p>
                  <p className="text-xs">Please check your configuration</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button
          onClick={onSettingsOpen}
          className="openai-input-btn"
          title="Chat settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatToolbar; 