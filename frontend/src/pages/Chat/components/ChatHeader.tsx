/**
 * Enhanced Chat Header Component
 * Complete toolbar with model selection, settings, and all required functions
 */

import React, { useState } from 'react';
import { 
  MessageCircle, 
  Settings, 
  MoreVertical, 
  Bot,
  Plus,
  ChevronDown,
  Users,
  Zap,
  Link,
  Copy,
  Trash2
} from 'lucide-react';

// Types
interface SimpleConversation {
  id: number;
  title: string;
  agent_id?: number;
  message_count: number;
  created_at: string;
  updated_at?: string;
  last_message_at?: string;
  is_active?: boolean;
}

interface SimpleAgent {
  id: number;
  name: string;
  description?: string;
  model_name: string;
  model_provider?: string;
  is_active?: boolean;
}

interface ChatHeaderProps {
  selectedConversation: SimpleConversation;
  messagesCount: number;
  availableAgents?: SimpleAgent[];
  selectedAgent?: SimpleAgent | null;
  onModelSelect?: (agent: SimpleAgent) => void;
  onSettingsOpen?: () => void;
  onNewChat?: () => void;
  onDeleteConversation?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedConversation,
  messagesCount,
  availableAgents = [],
  selectedAgent,
  onModelSelect,
  onSettingsOpen,
  onNewChat,
  onDeleteConversation
}) => {
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/dashboard/chat/${selectedConversation.id}`;
    navigator.clipboard.writeText(url);
    // Could add notification here
  };

  const currentAgent = selectedAgent || availableAgents.find(a => a.id === selectedConversation.agent_id);

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      {/* Main Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left - Conversation Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{selectedConversation.title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {currentAgent ? (
                  <>
                    <Bot className="w-4 h-4" />
                    <span>{currentAgent.name}</span>
                    <span>•</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    <span>Direct Chat</span>
                    <span>•</span>
                  </>
                )}
                <span>{messagesCount} messages</span>
                <span>•</span>
                <span>ID: {selectedConversation.id}</span>
              </div>
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            {/* New Chat Button */}
            <button
              onClick={onNewChat}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>

            {/* Settings Button */}
            <button
              onClick={onSettingsOpen}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* More Actions */}
            <div className="relative">
              <button
                onClick={() => setShowMore(!showMore)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* More Actions Dropdown */}
              {showMore && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => {
                      handleCopyLink();
                      setShowMore(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Chat Link
                  </button>
                  <button
                    onClick={() => {
                      window.open(`/dashboard/chat/${selectedConversation.id}`, '_blank');
                      setShowMore(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Link className="w-4 h-4" />
                    Open in New Tab
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      onDeleteConversation?.();
                      setShowMore(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar - Model Selection and Advanced Options */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          {/* Left - Model Selection */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Bot className="w-4 h-4 text-blue-600" />
                <span className="font-medium">
                  {currentAgent ? currentAgent.name : 'Select Model'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {/* Model Selector Dropdown */}
              {showModelSelector && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Available Models
                    </div>
                    {availableAgents.length === 0 ? (
                      <div className="text-sm text-gray-500 p-2">No agents available</div>
                    ) : (
                      availableAgents.map((agent) => (
                        <button
                          key={agent.id}
                          onClick={() => {
                            onModelSelect?.(agent);
                            setShowModelSelector(false);
                          }}
                          className={`w-full flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors ${
                            currentAgent?.id === agent.id ? 'bg-blue-50 ring-1 ring-blue-200' : ''
                          }`}
                        >
                          <Bot className="w-4 h-4 mt-0.5 text-blue-600" />
                          <div className="text-left">
                            <div className="font-medium text-sm text-gray-900">{agent.name}</div>
                            <div className="text-xs text-gray-500">
                              {agent.model_provider} • {agent.model_name}
                            </div>
                            {agent.description && (
                              <div className="text-xs text-gray-400 mt-1 truncate">
                                {agent.description}
                              </div>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Model Info */}
            {currentAgent && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="px-2 py-1 bg-white border border-gray-200 rounded">
                  {currentAgent.model_provider}
                </span>
                <span className="px-2 py-1 bg-white border border-gray-200 rounded">
                  {currentAgent.model_name}
                </span>
              </div>
            )}
          </div>

          {/* Right - Quick Actions */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              Chat ID: {selectedConversation.id}
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:bg-white rounded transition-colors">
              <Users className="w-3 h-3" />
              Share
            </button>
            <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:bg-white rounded transition-colors">
              <Zap className="w-3 h-3" />
              Optimize
            </button>
          </div>
        </div>
      </div>

      {/* Click outside handler */}
      {(showModelSelector || showMore) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowModelSelector(false);
            setShowMore(false);
          }}
        />
      )}
    </div>
  );
}; 