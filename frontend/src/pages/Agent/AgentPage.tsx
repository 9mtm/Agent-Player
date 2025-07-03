import React, { useState, useEffect } from 'react';
import { useAgent } from './hooks';
import { LoadingState, ChildAgentConnections } from './components';
import AgentBuilder from './components/AgentBuilder';
import TestAgentModal from './components/TestAgentModal';
import agentsService from '../../services/agents';
import { useNotificationContext } from '../../context/NotificationContext';
import { configUtils } from '../../config';
import { useNavigate } from 'react-router-dom';

interface AgentData {
  id: number;
  name: string;
  description?: string;
  status?: 'active' | 'inactive';
  type?: string;
  tasks?: number;
  performance?: string;
  llmProvider?: string;
  llmModel?: string;
  connectedLLMs?: string[];
  parentAgent?: string;
  // Additional properties for editing
  apiKey?: string;
  temperature?: string;
  maxTokens?: number;
  capabilities?: string[];
  specialization?: string;
  learningEnabled?: boolean;
  autonomyLevel?: string;
  // ✅ NEW: Complete configuration support
  llmConfig?: AgentFormData['llmConfig'];
  settings?: AgentFormData['settings'];
}

interface AgentFormData {
  name: string;
  description: string;
  type: string;
  capabilities: string[];
  parent_agent_id?: number;
  llmConfig?: {
    provider: string;
    model: string;
    deployment: 'online' | 'local';
    apiKey: string;
    localConfig: {
      host: string;
      port: string;
      endpoint: string;
    };
  };
  settings: {
    autoResponse: boolean;
    learning: boolean;
    maxConcurrency: number;
    temperature?: number;
    maxTokens?: number;
  };
}

type MainAgentRequest = {
  name: string;
  description: string;
  model_provider: string;
  model_name: string;
  api_key: string;
  system_prompt: string;
  capabilities: string[];
  tools_enabled: string[];
  temperature: string;
  max_tokens: number;
  timeout_seconds: number;
  is_public: boolean;
  is_system: boolean;
};

type ChildAgentRequest = {
  name: string;
  description: string;
  agent_type: string;
  parent_agent_id: number;
  model_provider: string;
  model_name: string;
  api_key: string;
  system_prompt: string;
  capabilities: string[];
  tools_enabled: string[];
  temperature: number;
  max_tokens: number;
  timeout_seconds: number;
  is_system: boolean;
  is_local_model: boolean;
  local_config: object | null;
};

const AgentPage: React.FC = () => {
  const agent = useAgent();
  const { showSuccess, showError, confirm } = useNotificationContext();
  const [activeTab, setActiveTab] = useState<'main' | 'child'>('main');
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderType, setBuilderType] = useState<'main' | 'child'>('main');
  const [editingAgent, setEditingAgent] = useState<AgentData | null>(null);
  const [showConnections, setShowConnections] = useState(false);
  const [selectedAgentForConnections, setSelectedAgentForConnections] = useState<AgentData | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedAgentForTest, setSelectedAgentForTest] = useState<AgentData | null>(null);
  const [agents, setAgents] = useState<{main: AgentData[], child: AgentData[]}>({
    main: [],
    child: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load agents from API
  const loadAgents = async () => {
    try {
      setLoading(true);
      
      // Load main agents - Using consistent API paths
      const mainAgentsUrl = configUtils.getApiUrl(configUtils.getEndpoint('agents', 'main'));
      console.log('🔗 Loading main agents from:', mainAgentsUrl);
      const mainAgentsResponse = await fetch(mainAgentsUrl);
      const mainAgentsData = await mainAgentsResponse.json();
      
      // Debug logging
      console.log('🔍 Main Agents API Response:', mainAgentsData);
      console.log('🔍 Main Agents Data Array:', mainAgentsData.data);
      
      // Extract agents array safely
      const mainAgentsArray = Array.isArray(mainAgentsData.data?.agents) 
        ? mainAgentsData.data.agents.filter((agent: { type: string; parent_agent_id: number; }) => agent.type === 'main' || !agent.parent_agent_id)
        : [];
      
      console.log('🔍 Main Agents Array:', mainAgentsArray);
      console.log('🔍 Main Agents Data Length:', mainAgentsArray.length);
      
      const mainAgents = mainAgentsArray.map((agent: { 
        id: number; 
        name: string; 
        description?: string; 
        status?: string; 
        performance_score?: number; 
        model_provider?: string; 
        model_name?: string;
        type?: string;
      }) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description || 'AI Agent for automated tasks and workflows',
        status: agent.status || 'active',
        type: 'main',
        tasks: 0,
        performance: (agent.performance_score || 100) + '%',
        llmProvider: agent.model_provider,
        llmModel: agent.model_name,
      }));

      // Load child agents - Using consistent API paths
      const childAgentsUrl = configUtils.getApiUrl(configUtils.getEndpoint('agents', 'child'));
      console.log('🔗 Loading child agents from:', childAgentsUrl);
      const childAgentsResponse = await fetch(childAgentsUrl);
      const childAgentsData = await childAgentsResponse.json();
      
      // Debug logging
      console.log('🔍 Child Agents API Response:', childAgentsData);
      console.log('🔍 Child Agents Data Array:', childAgentsData.data);
      
      // Extract agents array safely and ensure they are child agents
      const childAgentsArray = Array.isArray(childAgentsData.data?.agents)
        ? childAgentsData.data.agents.filter((agent: { type: string; parent_agent_id: number; }) => agent.type === 'child' || agent.parent_agent_id)
        : [];
      
      console.log('🔍 Child Agents Array:', childAgentsArray);
      console.log('🔍 Child Agents Data Length:', childAgentsArray.length);
      
      const childAgents = childAgentsArray.map((agent: { 
        id: number; 
        name: string; 
        description?: string; 
        status?: string; 
        tasks_completed?: number; 
        performance_score?: number; 
        parent_agent_name?: string;
        type?: string;
      }) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description || 'Specialized child agent for training and execution',
        status: agent.status || 'active',
        type: 'child',
        tasks: agent.tasks_completed || 0,
        performance: (agent.performance_score || 100) + '%',
        connectedLLMs: ['GPT-4'], // Default for demo
        parentAgent: agent.parent_agent_name || 'Main Agent',
      }));

      console.log('🚀 Final Main Agents:', mainAgents);
      console.log('🤖 Final Child Agents:', childAgents);

      setAgents({
        main: mainAgents.filter(agent => agent.type === 'main'),  // Extra safety check
        child: childAgents.filter(agent => agent.type === 'child') // Extra safety check
      });

    } catch (error) {
      console.error('❌ Error loading agents:', error);
      console.error('🔗 API Base URL:', configUtils.getApiUrl(''));
      console.error('🌐 Full error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown'
      });
      
      const errorMessage = error instanceof Error 
        ? `Failed to load agents: ${error.message}`
        : 'Failed to load agents from server';
        
      showError('Error Loading Agents', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load agents on component mount
  useEffect(() => {
    loadAgents();
  }, []);

  // Add refresh function to reload data manually
  const refreshAgents = async () => {
    console.log('🔄 Manual refresh triggered');
    await loadAgents();
  };

  // Show loading state
  if (agent.loading || loading) {
    return <LoadingState />;
  }

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      paddingTop: '20px',
    },
    content: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '0 20px',
    },
    header: {
      marginBottom: '30px',
      textAlign: 'center' as const,
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '8px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    subtitle: {
      fontSize: '16px',
      color: '#6c757d',
      marginBottom: '30px',
    },
    tabContainer: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '30px',
      borderBottom: '2px solid #e9ecef',
    },
    tab: {
      padding: '12px 24px',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '500',
      color: '#6c757d',
      borderBottom: '3px solid transparent',
      transition: 'all 0.3s ease',
      margin: '0 10px',
    },
    activeTab: {
      color: '#667eea',
      borderBottom: '3px solid #667eea',
    },
    agentsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
      gap: '24px',
      marginBottom: '30px',
    },
    agentCard: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      border: '1px solid #f0f0f0',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    },
    agentCardHover: {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
    },
    agentIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      marginBottom: '16px',
    },
    agentName: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '8px',
    },
    agentDescription: {
      fontSize: '14px',
      color: '#6c757d',
      lineHeight: '1.5',
      marginBottom: '16px',
    },
    agentStatus: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500',
      marginBottom: '16px',
    },
    activeStatus: {
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb',
    },
    inactiveStatus: {
      backgroundColor: '#f8f9fa',
      color: '#6c757d',
      border: '1px solid #dee2e6',
    },
    llmInfo: {
      backgroundColor: '#f0f8ff',
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '16px',
      border: '1px solid #e3f2fd',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    llmTitle: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#1976d2',
      marginBottom: '8px',
    },
    llmList: {
      fontSize: '11px',
      color: '#666',
      lineHeight: '1.4',
    },
    parentInfo: {
      fontSize: '11px',
      color: '#888',
      fontStyle: 'italic',
      marginTop: '4px',
    },
    actionButtons: {
      display: 'flex',
      gap: '8px',
    },
    button: {
      flex: 1,
      padding: '8px 16px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
    },
    primaryButton: {
      backgroundColor: '#667eea',
      color: 'white',
    },
    secondaryButton: {
      backgroundColor: '#e9ecef',
      color: '#495057',
    },
    dangerButton: {
      backgroundColor: '#dc3545',
      color: 'white',
    },
    successButton: {
      backgroundColor: '#28a745',
      color: 'white',
    },
    createButton: {
      position: 'fixed' as const,
      bottom: '30px',
      right: '30px',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: 'none',
      color: 'white',
      fontSize: '24px',
      cursor: 'pointer',
      boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
      transition: 'all 0.3s ease',
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      color: '#6c757d',
    },
    emptyIcon: {
      fontSize: '64px',
      marginBottom: '16px',
    },
    emptyTitle: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '8px',
      color: '#495057',
    },
    emptyDescription: {
      fontSize: '16px',
      marginBottom: '24px',
    },
  };

  const handleCreateAgent = (type: 'main' | 'child') => {
    setBuilderType(type);
            setEditingAgent(null); // Signal for creating new agent
    setShowBuilder(true);
  };

  const handleSaveAgent = async (agentData: AgentFormData) => {
    const isEditing = editingAgent !== null;
    console.log(isEditing ? 'Updating agent:' : 'Creating agent:', agentData);
    
    try {
      // Calculate API endpoint from local configuration
      let apiEndpoint = null;
      let localConfig = null;
      
      if (agentData.llmConfig?.deployment === 'local' && agentData.llmConfig.localConfig) {
        const { host, port, endpoint } = agentData.llmConfig.localConfig;
        // Construct full API endpoint URL
        apiEndpoint = `http://${host}:${port}${endpoint}`;
        localConfig = {
          host,
          port,
          endpoint,
          full_url: apiEndpoint
        };
        console.log('🏠 Local configuration detected:', {
          localConfig,
          apiEndpoint
        });
      } else if (agentData.llmConfig?.provider) {
        // Online providers - use standard endpoints
        const providerEndpoints = {
          'openai': 'https://api.openai.com/v1/chat/completions',
          'anthropic': 'https://api.anthropic.com/v1/messages',
          'google': 'https://generativelanguage.googleapis.com/v1beta/models',
          'azure': 'https://api.cognitive.microsoft.com/v1/chat/completions',
          'mistral': 'https://api.mistral.ai/v1/chat/completions',
          'cohere': 'https://api.cohere.ai/v1/generate',
          'perplexity': 'https://api.perplexity.ai/chat/completions',
          'huggingface': 'https://api-inference.huggingface.co/models',
          'together': 'https://api.together.xyz/inference',
          'replicate': 'https://api.replicate.com/v1/predictions',
          'openrouter': 'https://openrouter.ai/api/v1/chat/completions',
          'ai21': 'https://api.ai21.com/studio/v1/chat/completions',
          'anyscale': 'https://api.anyscale.com/v1/chat/completions'
        };
        
        apiEndpoint = providerEndpoints[agentData.llmConfig.provider as keyof typeof providerEndpoints] || null;
        console.log('🌐 Online provider endpoint:', {
          provider: agentData.llmConfig.provider,
          apiEndpoint
        });
      }

      // Prepare data for backend based on agent type
      let agentRequest: any;

      if (builderType === 'main') {
        agentRequest = {
          name: agentData.name,
          description: agentData.description || '',
          model_provider: agentData.llmConfig?.provider || 'openai',
          model_name: agentData.llmConfig?.model || 'gpt-4',
          api_key: agentData.llmConfig?.apiKey || '',
          api_endpoint: apiEndpoint, // ✅ NEW: Include calculated endpoint
          system_prompt: '',
          capabilities: agentData.capabilities || [],
          tools_enabled: ['chat', 'analysis'],
          temperature: typeof agentData.settings?.temperature === 'number' 
            ? agentData.settings.temperature 
            : parseFloat(agentData.settings?.temperature?.toString() || '0.7'),
          max_tokens: agentData.settings?.maxTokens || 4000,
          timeout_seconds: 300,
          is_public: false,
          is_system: false,
          // ✅ NEW: Include local configuration if available
          ...(localConfig && {
            is_local_model: true,
            local_config: localConfig
          })
        };
      } else {
        // Child Agent - match backend ChildAgentCreateRequest schema
        agentRequest = {
          name: agentData.name,
          description: agentData.description || '',
          agent_type: 'child',  // Required by backend
          parent_agent_id: agentData.parent_agent_id || 1, // Default to first main agent if not specified
          model_provider: agentData.llmConfig?.provider || 'openai',
          model_name: agentData.llmConfig?.model || 'gpt-4',
          api_key: agentData.llmConfig?.apiKey || '',
          api_endpoint: apiEndpoint, // ✅ NEW: Include calculated endpoint
          system_prompt: `You are a specialized child agent trained for ${agentData.type || 'general'} tasks.`,
          capabilities: agentData.capabilities || [],
          tools_enabled: ['chat', 'analysis'],
          temperature: agentData.settings?.temperature || 0.7,
          max_tokens: agentData.settings?.maxTokens || 2048,
          timeout_seconds: 300,
          is_system: false,
          // ✅ NEW: Include local configuration
          is_local_model: agentData.llmConfig?.deployment === 'local',
          local_config: localConfig
        };
      }

      console.log('📤 Sending agent request to backend:', {
        agentRequest,
        isEditing,
        builderType
      });

      let result;
      if (isEditing && editingAgent) {
        // Update existing agent
        const apiEndpoint = builderType === 'child' ? 'agents/child' : 'agents';
        const updateUrl = configUtils.getApiUrl(`/${apiEndpoint}/${editingAgent.id}`);
        console.log('🔧 Updating agent via:', updateUrl);
        
        const token = localStorage.getItem('access_token');
        const response = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(agentRequest),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Update failed:', {
            status: response.status,
            statusText: response.statusText,
            errorText
          });
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        result = await response.json();
        console.log('🎯 Agent updated successfully:', result);
      } else {
        // Create new agent
        const token = localStorage.getItem('access_token');
        const createUrl = configUtils.getApiUrl(builderType === 'child' ? '/agents/child' : '/agents');
        console.log('🆕 Creating agent via:', createUrl);
        
        const response = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(agentRequest),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Creation failed:', {
            status: response.status,
            statusText: response.statusText,
            errorText
          });
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        result = await response.json();
        console.log('🎯 Agent created successfully:', result);
      }

      // Close builder and clear editing state
      setShowBuilder(false);
      setEditingAgent(null);

      // Show success message
      showSuccess(
        isEditing 
          ? `${builderType === 'main' ? 'Main' : 'Child'} Agent Updated`
          : `${builderType === 'main' ? 'Main' : 'Child'} Agent Created`,
        isEditing 
          ? `"${agentData.name}" updated successfully with ${apiEndpoint ? 'local' : 'online'} configuration!`
          : `"${agentData.name}" created successfully with ${apiEndpoint ? 'local' : 'online'} configuration!`
      );

      // Force immediate reload
      console.log('🔄 Reloading agents data immediately...');
      await loadAgents();
      
      // Also reload again after delay to ensure consistency
      setTimeout(async () => {
        console.log('🔄 Secondary reload for consistency...');
        await loadAgents();
      }, 1000);

      // Navigate to board for Child Agents only (for new agents)
      if (!isEditing && builderType === 'child' && result.data?.id) {
        setTimeout(() => {
          confirm(
            '🤖 Child Agent created! Would you like to go to the Training Board?',
            'Go to Training Board',
            () => {
              navigate(`/dashboard/board/child-agent/${result.data.id}`);
            }
          );
        }, 1000);
      }

    } catch (error) {
      console.error(isEditing ? 'Error updating agent:' : 'Error creating agent:', error);
      showError(
        isEditing ? 'Error Updating Agent' : 'Error Creating Agent',
        `Failed to ${isEditing ? 'update' : 'create'} agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  // Load full agent data for editing
  const loadAgentForEdit = async (agentData: AgentData, isChild: boolean) => {
    try {
      // Use correct API endpoint without /api/v1 prefix
      const apiEndpoint = isChild ? 'agents/child' : 'agents';
      const url = configUtils.getApiUrl(`/${apiEndpoint}/${agentData.id}`);
      
      console.log('🔧 Loading full agent data for editing:', url);
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        const fullAgentData = result.data;
        console.log('📋 Full agent data loaded from backend:', fullAgentData);
        
        // ✅ NEW: Determine deployment type from backend data
        let deployment: 'online' | 'local' = 'online';
        let localConfig = {
          host: 'localhost',
          port: '8080',
          endpoint: '/v1/chat/completions'
        };
        
        // Check if this is a local deployment
        if (fullAgentData.is_local_model || fullAgentData.local_config || 
            (fullAgentData.api_endpoint && fullAgentData.api_endpoint.includes('localhost'))) {
          deployment = 'local';
          
          // Parse local config from stored data
          if (fullAgentData.local_config) {
            console.log('🏠 Found local_config in backend:', fullAgentData.local_config);
            localConfig = {
              host: fullAgentData.local_config.host || 'localhost',
              port: fullAgentData.local_config.port || '8080',
              endpoint: fullAgentData.local_config.endpoint || '/v1/chat/completions'
            };
          } else if (fullAgentData.api_endpoint) {
            // Parse from api_endpoint URL
            console.log('🔗 Parsing from api_endpoint:', fullAgentData.api_endpoint);
            try {
              const url = new URL(fullAgentData.api_endpoint);
              localConfig = {
                host: url.hostname,
                port: url.port || '8080',
                endpoint: url.pathname
              };
            } catch (e) {
              console.warn('⚠️ Failed to parse api_endpoint, using defaults');
            }
          }
        }
        
        console.log('🎯 Determined configuration:', {
          deployment,
          localConfig,
          api_endpoint: fullAgentData.api_endpoint,
          is_local_model: fullAgentData.is_local_model
        });
        
        // ✅ NEW: Convert backend data to AgentFormData format with complete llmConfig
        const editingData: AgentData & { llmConfig: AgentFormData['llmConfig']; settings: AgentFormData['settings'] } = {
          id: fullAgentData.id,
          name: fullAgentData.name,
          description: fullAgentData.description || '',
          status: fullAgentData.status,
          type: isChild ? 'child' : 'main',
          tasks: fullAgentData.tasks_completed || 0,
          performance: (fullAgentData.performance_score || 100) + '%',
          llmProvider: fullAgentData.model_provider,
          llmModel: fullAgentData.model_name,
          // Basic properties for editing
          apiKey: fullAgentData.api_key || '',
          temperature: fullAgentData.temperature?.toString() || '0.7',
          maxTokens: fullAgentData.max_tokens || 4000,
          capabilities: fullAgentData.capabilities || [],
          parentAgent: fullAgentData.parent_agent_name,
          // Child-specific properties
          specialization: fullAgentData.specialization || 'general',
          learningEnabled: fullAgentData.learning_enabled || true,
          autonomyLevel: fullAgentData.autonomy_level || 'supervised',
          
          // ✅ NEW: Complete LLM Configuration
          llmConfig: {
            provider: fullAgentData.model_provider || 'openai',
            model: fullAgentData.model_name || 'gpt-4',
            deployment: deployment, // ✅ Based on backend data
            apiKey: fullAgentData.api_key || '',
            localConfig: localConfig // ✅ Parsed from backend
          },
          
          // ✅ NEW: Settings from backend
          settings: {
            autoResponse: fullAgentData.auto_response || false,
            learning: fullAgentData.learning_enabled || true,
            maxConcurrency: fullAgentData.max_concurrency || 1,
            temperature: typeof fullAgentData.temperature === 'number' 
              ? fullAgentData.temperature 
              : parseFloat(fullAgentData.temperature?.toString() || '0.7'),
            maxTokens: fullAgentData.max_tokens || 4000
          }
        };
        
        console.log('✅ Final editing data prepared:', editingData);
        return editingData;
      } else {
        console.error('❌ Failed to load agent data:', result.message);
        return agentData; // Use basic data as fallback
      }
    } catch (error) {
      console.error('❌ Error loading agent for edit:', error);
      return agentData; // Use basic data as fallback
    }
  };

  const handleEditAgent = async (agentData: AgentData, isChild: boolean) => {
    if (isChild) {
      // For Child Agents: Show configuration options
      confirm(
        `⚙️ Configure Child Agent: "${agentData.name}"\n\n` +
        `🔧 Available Configuration Options:\n` +
        `• Capabilities & Skills\n` +
        `• Behavioral Settings\n` +
        `• Training Parameters\n` +
        `• Parent Agent Connection\n\n` +
        `Click Yes to open Agent Builder for editing.`,
        'Configure Child Agent',
        async () => {
          // Load full agent data
          const fullAgentData = await loadAgentForEdit(agentData, true);
          
          // Open AgentBuilder in edit mode for child agent
          setBuilderType('child');
          setEditingAgent(fullAgentData);
          setShowBuilder(true);
          
          console.log('Opening Child Agent configuration for:', fullAgentData);
        }
      );
    } else {
      // For Main Agents: Show LLM configuration options  
      confirm(
        `🧠 Configure Main Agent: "${agentData.name}"\n\n` +
        `⚙️ Available LLM Configuration:\n` +
        `• Change LLM Provider\n` +
        `• Update API Keys\n` +
        `• Adjust Model Parameters\n` +
        `• Advanced Settings\n\n` +
        `Click Yes to open LLM configuration.`,
        'Configure Main Agent LLM',
        async () => {
          // Load full agent data
          const fullAgentData = await loadAgentForEdit(agentData, false);
          
          // Open AgentBuilder in edit mode for main agent
          setBuilderType('main');
          setEditingAgent(fullAgentData);
          setShowBuilder(true);
          
          console.log('Opening Main Agent LLM configuration for:', fullAgentData);
        }
      );
    }
  };

  const handleDeleteAgent = (agentData: AgentData) => {
    confirm(
      `⚠️ Are you sure you want to delete "${agentData.name}"?\n\nThis action cannot be undone.`,
      'Delete Agent',
      async () => {
        try {
          // Use the agentsService to delete the agent
          const result = await agentsService.deleteAgent(agentData.id);

          if (!result.success) {
            throw new Error(result.error || 'Failed to delete agent from server');
          }

          // Reload agents from API
          await loadAgents();

          showSuccess(
            'Agent Deleted',
            `"${agentData.name}" has been removed successfully.`
          );
        } catch (error: unknown) {
          console.error('Error deleting agent:', error);
          let errorMessage = 'Unknown error';
          if (typeof error === 'object' && error !== null && 'message' in error) {
            errorMessage = (error as { message?: string }).message || errorMessage;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
          showError(
            'Error Deleting Agent',
            `Failed to delete "${agentData.name}": ${errorMessage}`
          );
        }
      }
    );
  };

  const navigateToBoard = (agentData: AgentData) => {
    console.log(`🎯 Opening Board for: ${agentData.name}`);
    console.log(`🔗 Agent ID: ${agentData.id}`);
    
    // Navigate relative to /dashboard
    const targetUrl = `/dashboard/board/child-agent/${agentData.id}`;
    console.log(`📍 Target URL: ${targetUrl}`);
    console.log(`🚀 Navigating using React Router...`);
    
    // Use navigate with absolute path
    navigate(targetUrl, { replace: true });
  };

  const openLLMConnections = (agentData: AgentData) => {
    setSelectedAgentForConnections(agentData);
    setShowConnections(true);
  };

  const openTestModal = (agentData: AgentData) => {
    setSelectedAgentForTest(agentData);
    setShowTestModal(true);
  };

  const renderAgentCard = (agentData: AgentData, isChild = false) => (
    <div
      key={agentData.id}
      style={styles.agentCard}
      onClick={() => {
        if (isChild) {
          // Navigate to Board for Child Agents (Training)
          navigateToBoard(agentData);
        } else {
          // Open LLM configuration for Main Agents
          handleEditAgent(agentData, false);
        }
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
      }}
    >
      <div style={styles.agentIcon}>
        {isChild ? '🤖' : '🚀'}
      </div>
      
      <div style={styles.agentName}>
        {agentData.name || `Agent ${agentData.id}`}
      </div>
      
      <div style={styles.agentDescription}>
        {agentData.description || 'AI Agent for automated tasks and workflows'}
        <div style={{ 
          fontSize: '11px', 
          color: '#999', 
          marginTop: '8px', 
          fontStyle: 'italic' 
        }}>
          {isChild 
            ? '💡 Click to open Training Board' 
            : '💡 Click to configure LLM settings'
          }
        </div>
      </div>
      
      <div
        style={{
          ...styles.agentStatus,
          ...(agentData.status === 'active' ? styles.activeStatus : styles.inactiveStatus),
        }}
      >
        <span style={{ marginRight: '6px' }}>
          {agentData.status === 'active' ? '🟢' : '🔴'}
        </span>
        {agentData.status?.toUpperCase() || 'ACTIVE'}
      </div>

      {/* LLM Information for Main Agents */}
      {!isChild && agentData.llmProvider && (
        <div style={styles.llmInfo}>
          <div style={styles.llmTitle}>🧠 LLM Configuration</div>
          <div style={styles.llmList}>
            <div>Provider: {agentData.llmProvider}</div>
            <div>Model: {agentData.llmModel}</div>
          </div>
        </div>
      )}

      {/* LLM Connections for Child Agents */}
      {isChild && agentData.connectedLLMs && (
        <div 
          style={styles.llmInfo}
          onClick={(e) => {
            e.stopPropagation();
            openLLMConnections(agentData);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e3f2fd';
            e.currentTarget.style.borderColor = '#667eea';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f0f8ff';
            e.currentTarget.style.borderColor = '#e3f2fd';
          }}
        >
          <div style={styles.llmTitle}>🔗 Connected LLMs (Click for details)</div>
          <div style={styles.llmList}>
            {agentData.connectedLLMs.map((llm, index) => (
              <div key={index}>• {llm}</div>
            ))}
          </div>
          {agentData.parentAgent && (
            <div style={styles.parentInfo}>
              👥 Reports to: {agentData.parentAgent}
            </div>
          )}
        </div>
      )}

      {/* Performance Stats */}
      <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '16px' }}>
        <div>📊 Tasks: {agentData.tasks}</div>
        <div>⚡ Performance: {agentData.performance}</div>
      </div>
      
      <div style={styles.actionButtons}>
        {!isChild ? (
          <>
            <button 
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={(e) => {
                e.stopPropagation();
                handleEditAgent(agentData, false);
              }}
              title="Configure LLM provider, API keys, and model parameters"
            >
              LLM Config
            </button>
            <button 
              style={{ ...styles.button, ...styles.successButton }}
              onClick={(e) => {
                e.stopPropagation();
                openTestModal(agentData);
              }}
              title="Test this agent with OpenAI"
            >
              🧪 Test Agent
            </button>
            <button 
              style={{ ...styles.button, ...styles.dangerButton }}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAgent(agentData);
              }}
              title="Permanently delete this agent"
            >
              Delete
            </button>
          </>
        ) : (
          <>
            <button 
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={(e) => {
                e.stopPropagation();
                navigateToBoard(agentData);
              }}
              title="Open training board to teach this agent specific workflows"
            >
              Training Board
            </button>
            <button 
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={(e) => {
                e.stopPropagation();
                handleEditAgent(agentData, true);
              }}
              title="Configure agent capabilities, settings, and training parameters"
            >
              Configure
            </button>
            <button 
              style={{ ...styles.button, ...styles.dangerButton }}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAgent(agentData);
              }}
              title="Remove this child agent from the system"
            >
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );

  const renderEmptyState = (type: 'main' | 'child') => (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>
        {type === 'main' ? '🚀' : '🤖'}
      </div>
      <div style={styles.emptyTitle}>
        No {type === 'main' ? 'Main' : 'Child'} Agents
      </div>
      <div style={styles.emptyDescription}>
        {type === 'main' 
          ? 'Create your first Main Agent for LLM configuration and management'
          : 'Add specialized Child Agents that can be trained on specific workflows'
        }
      </div>
      <button
        style={{ ...styles.button, ...styles.primaryButton, width: 'auto', padding: '12px 24px' }}
        onClick={() => handleCreateAgent(type)}
      >
        Create {type === 'main' ? 'Main' : 'Child'} Agent
      </button>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>🚀 AI Agent Management</h1>
          <p style={styles.subtitle}>
            Create, manage, and deploy intelligent agents for your workflows
          </p>
          
          {/* Debug and Refresh Panel */}
          <div style={{
            textAlign: 'center',
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <button
              onClick={refreshAgents}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                marginRight: '15px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🔄 Refresh Agents
            </button>
            <span style={{ fontSize: '14px', color: '#6c757d' }}>
              📊 Main Agents: {agents.main.length} | 🤖 Child Agents: {agents.child.length} | 
              🔄 Status: {loading ? 'Loading...' : 'Ready'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'main' ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab('main')}
          >
            🚀 Main Agents ({agents.main.length})
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'child' ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab('child')}
          >
            🤖 Child Agents ({agents.child.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'main' ? (
          <>
            {agents.main.length > 0 ? (
              <div style={styles.agentsGrid}>
                {agents.main.map((agentData) => renderAgentCard(agentData, false))}
              </div>
            ) : (
              renderEmptyState('main')
            )}
          </>
        ) : (
          <>
            {agents.child.length > 0 ? (
              <div style={styles.agentsGrid}>
                {agents.child.map((agentData) => renderAgentCard(agentData, true))}
              </div>
            ) : (
              renderEmptyState('child')
            )}
          </>
        )}

        {/* Floating Create Button */}
        <button
          style={styles.createButton}
          onClick={() => handleCreateAgent(activeTab)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          +
        </button>
      </div>

      {/* Agent Builder Modal */}
      <AgentBuilder
        isOpen={showBuilder}
        onClose={() => {
          setShowBuilder(false);
          setEditingAgent(null); // Clear editing state on cancel
        }}
        onSave={handleSaveAgent}
        agentType={builderType}
        initialData={editingAgent || undefined}
        isEditing={editingAgent !== null}
      />

      {/* Child Agent Connections Modal */}
      <ChildAgentConnections
        isOpen={showConnections}
        onClose={() => setShowConnections(false)}
        agentName={selectedAgentForConnections?.name || ''}
        connections={selectedAgentForConnections?.connectedLLMs || []}
      />

      {/* Test Agent Modal */}
      <TestAgentModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        agentName={selectedAgentForTest?.name || ''}
        agentId={selectedAgentForTest?.id || 0}
      />
    </div>
  );
};

export default AgentPage; 