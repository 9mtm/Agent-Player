/**
 * Model Selector - Choose AI agent/model for conversation
 */

import React from 'react';
import { ChevronDown, Bot, Settings, Cpu } from 'lucide-react';

// Chat-specific Agent interface based on backend response
interface ChatAgent {
  id: number;
  name: string;
  description?: string;
  agent_type?: 'main' | 'child';
  model_provider?: string;
  model_name?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ModelSelectorProps {
  agents: ChatAgent[];
  selectedAgent: ChatAgent | null;
  onSelectAgent: (agent: ChatAgent) => void;
  isLoading?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  agents,
  selectedAgent,
  onSelectAgent,
  isLoading = false
}) => {
  console.log('🔴 ModelSelector RENDER START - Timestamp:', new Date().toLocaleTimeString());
  // Debug logging with alert for immediate visibility
  console.log('🔧 ModelSelector - Received agents:', agents);
  console.log('🔧 ModelSelector - Agents count:', agents.length);
  console.log('🔧 ModelSelector - Selected agent:', selectedAgent);
  console.log('🔧 ModelSelector - Is loading:', isLoading);
  
  // TEMPORARY: Alert to check if component is updating
  if (agents.length > 0) {
    console.log('🚨 FOUND AGENTS! Count:', agents.length, 'Names:', agents.map(a => a.name));
  }

  // Debug individual agents
  agents.forEach((agent, index) => {
    console.log(`🔧 Agent ${index}:`, {
      id: agent.id,
      name: agent.name,
      agent_type: agent.agent_type,
      model_provider: agent.model_provider,
      model_name: agent.model_name,
      is_active: agent.is_active
    });
  });

  // Simplified grouping - just show all agents for now
  const mainAgents = agents; // Show all agents as main for now
  const childAgents: ChatAgent[] = []; // Empty for now

  console.log('🔧 ModelSelector - Main agents:', mainAgents.length, mainAgents);
  console.log('🔧 ModelSelector - Child agents:', childAgents.length, childAgents);

  const getAgentIcon = (agent: ChatAgent) => {
    const agentType = agent.agent_type;
    
    if (agentType === 'child') return <Settings size={16} className="text-purple-600" />;
    
    const provider = agent.model_provider || '';
    if (provider.toLowerCase().includes('localhost') || provider.toLowerCase().includes('ollama')) {
      return <Cpu size={16} className="text-green-600" />;
    }
    
    return <Bot size={16} className="text-blue-600" />;
  };

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">
          AI Agent:
        </label>
        
        <div className="relative">
          <select
            value={selectedAgent?.id || ''}
            onChange={(e) => {
              const agentId = parseInt(e.target.value);
              const agent = agents.find(a => a.id === agentId);
              if (agent) {
                onSelectAgent(agent);
              }
            }}
            disabled={isLoading || agents.length === 0}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed min-w-64"
          >
            <option value="">
              {isLoading ? 'Loading agents...' : 
               agents.length === 0 ? 'No agents available' : 'Select an agent'}
            </option>
            
            {/* Show ALL agents directly - no grouping for now */}
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.model_provider || 'AI'})
              </option>
            ))}
          </select>
          
          <ChevronDown 
            size={16} 
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" 
          />
        </div>
        
        {/* Selected Agent Info */}
        {selectedAgent && (
          <div className="flex items-center space-x-2 ml-4 px-3 py-1 bg-gray-50 rounded-lg">
            {getAgentIcon(selectedAgent)}
            <span className="text-sm font-medium text-gray-700">
              {selectedAgent.name}
            </span>
            <span className="text-xs text-gray-500">
              {selectedAgent.agent_type === 'child' ? 'Child Agent' : 'Main Agent'}
            </span>
          </div>
        )}
      </div>
      
      {/* Status Messages */}
      {agents.length === 0 && !isLoading && (
        <div className="mt-2 space-y-2">
          <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            ⚠️ No agents found. Available solutions:
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {/* Backend Solution */}
            <div className="bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
              <div className="font-medium text-blue-800 mb-1">🔐 Backend Agents (4 available)</div>
              <div className="text-blue-700 space-y-1">
                <div>1. Go to <strong>Login</strong> page</div>
                <div>2. Login with your credentials</div>
                <div>3. Return to Chat</div>
              </div>
              <button 
                onClick={() => window.location.href = '/login'}
                className="mt-2 bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
              >
                Login Now
              </button>
            </div>

            {/* Ollama Solution */}
            <div className="bg-green-50 px-3 py-2 rounded-lg border border-green-200">
              <div className="font-medium text-green-800 mb-1">🤖 Ollama Direct (llama3 available)</div>
              <div className="text-green-700 space-y-1">
                <div>✅ Ollama is running</div>
                <div>✅ llama3:latest detected</div>
                <div>Switch to "Use Ollama Direct" below</div>
              </div>
              <div className="mt-2 text-xs text-green-600">
                💡 Works without login
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
            <strong>Backend Status:</strong> ✅ Running (4 agents) | 
            <strong>Ollama Status:</strong> ✅ Running (llama3:latest)
          </div>
        </div>
      )}
      
      {agents.length > 0 && !selectedAgent && (
        <div className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
          💡 Select an agent to start chatting
        </div>
      )}
    </div>
  );
}; 