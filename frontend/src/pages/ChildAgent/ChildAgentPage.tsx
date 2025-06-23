import React, { useState, useEffect } from 'react';
import { useNotificationContext } from '../../context/NotificationContext';

interface ParentAgent {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  performance_score: number;
}

interface ChildAgent {
  id: number;
  name: string;
  description: string;
  parent_agent_id: number;
  parent_agent_name: string;
  specialization: string;
  status: 'active' | 'training' | 'inactive';
  autonomy_level: 'supervised' | 'semi-autonomous' | 'autonomous';
  learning_enabled: boolean;
  tasks_completed: number;
  performance_score: number;
  created_at: string;
  capabilities: string[];
}

interface CreateChildAgentData {
  name: string;
  description: string;
  parent_agent_id: number;
  specialization: string;
  capabilities: string[];
  autonomy_level: 'supervised' | 'semi-autonomous' | 'autonomous';
  learning_enabled: boolean;
}

const ChildAgentPage: React.FC = () => {
  const { showSuccess, showError, confirm } = useNotificationContext();
  const [childAgents, setChildAgents] = useState<ChildAgent[]>([]);
  const [parentAgents, setParentAgents] = useState<ParentAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedParentFilter, setSelectedParentFilter] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'hierarchy'>('grid');

  // Fetch data on component mount
  useEffect(() => {
    fetchChildAgents();
    fetchParentAgents();
  }, []);

  const fetchChildAgents = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/child-agents');
      const result = await response.json();
      if (result.success) {
        setChildAgents(result.data);
      } else {
        showError('Error', 'Failed to fetch child agents');
      }
    } catch (error) {
      console.error('Error fetching child agents:', error);
      showError('Error', 'Network error while fetching child agents');
    }
  };

  const fetchParentAgents = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/agents');
      const result = await response.json();
      if (result.success) {
        setParentAgents(result.data);
      } else {
        showError('Error', 'Failed to fetch parent agents');
      }
    } catch (error) {
      console.error('Error fetching parent agents:', error);
      showError('Error', 'Network error while fetching parent agents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChildAgent = async (data: CreateChildAgentData) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/child-agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          parent_agent_id: data.parent_agent_id,
          specialization: data.specialization,
          capabilities: data.capabilities,
          autonomy_level: data.autonomy_level,
          learning_enabled: data.learning_enabled,
          training_data: {}
        }),
      });

      const result = await response.json();
      if (result.success) {
        setChildAgents(prev => [...prev, result.data]);
        setShowCreateModal(false);
        showSuccess('Success', `Child Agent "${data.name}" created successfully!`);
        
        // Ask if user wants to start training
        setTimeout(() => {
          confirm(
            `🎓 Child Agent created! Would you like to start training "${data.name}"?`,
            'Start Training',
            () => handleStartTraining(result.data.id)
          );
        }, 1000);
      } else {
        showError('Error', result.message || 'Failed to create child agent');
      }
    } catch (error) {
      console.error('Error creating child agent:', error);
      showError('Error', 'Network error while creating child agent');
    }
  };

  const handleStartTraining = async (childAgentId: number) => {
    try {
      const trainingData = {
        training_type: "basic_skills",
        duration_minutes: 30,
        data_sources: ["parent_agent_logs", "knowledge_base"],
        focus_areas: ["communication", "problem_solving"]
      };

      const response = await fetch(`http://127.0.0.1:8000/api/v1/child-agents/${childAgentId}/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trainingData),
      });

      const result = await response.json();
      if (result.success) {
        showSuccess('Training Started', `Training for Child Agent ${childAgentId} has begun. ${result.estimated_duration}`);
        
        // Update child agent status to training
        setChildAgents(prev => prev.map(agent => 
          agent.id === childAgentId 
            ? { ...agent, status: 'training' as const }
            : agent
        ));
      } else {
        showError('Error', result.message || 'Failed to start training');
      }
    } catch (error) {
      console.error('Error starting training:', error);
      showError('Error', 'Network error while starting training');
    }
  };

  const handleDeleteChildAgent = async (childAgent: ChildAgent) => {
    confirm(
      `⚠️ Are you sure you want to delete "${childAgent.name}"?\n\nThis will permanently remove the child agent and all its training data.`,
      'Delete Child Agent',
      async () => {
        try {
          const response = await fetch(`http://127.0.0.1:8000/api/v1/child-agents/${childAgent.id}`, {
            method: 'DELETE',
          });

          const result = await response.json();
          if (result.success) {
            setChildAgents(prev => prev.filter(agent => agent.id !== childAgent.id));
            showSuccess('Deleted', `Child Agent "${childAgent.name}" has been deleted successfully.`);
          } else {
            showError('Error', result.message || 'Failed to delete child agent');
          }
        } catch (error) {
          console.error('Error deleting child agent:', error);
          showError('Error', 'Network error while deleting child agent');
        }
      }
    );
  };

  const navigateToTrainingBoard = (childAgent: ChildAgent) => {
    // Navigate to training board with fixed board ID 158831
    window.location.href = `/dashboard/board/child-agent/158831`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'training': return '#ffc107';
      case 'inactive': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getAutonomyColor = (level: string) => {
    switch (level) {
      case 'supervised': return '#17a2b8';
      case 'semi-autonomous': return '#fd7e14';
      case 'autonomous': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const filteredChildAgents = selectedParentFilter 
    ? childAgents.filter(agent => agent.parent_agent_id === selectedParentFilter)
    : childAgents;

  const groupedByParent = parentAgents.map(parent => ({
    parent,
    children: childAgents.filter(child => child.parent_agent_id === parent.id)
  }));

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
          <div style={{ fontSize: '18px' }}>Loading Child Agents...</div>
        </div>
      </div>
    );
  }

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    },
    content: {
      maxWidth: '1400px',
      margin: '0 auto',
    },
    header: {
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '32px',
      marginBottom: '24px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '8px',
    },
    subtitle: {
      fontSize: '16px',
      color: '#6c757d',
      marginBottom: '24px',
    },
    controls: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
      gap: '16px',
    },
    filtersAndActions: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
    },
    select: {
      padding: '10px 16px',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white',
      cursor: 'pointer',
    },
    viewToggle: {
      display: 'flex',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: 'white',
    },
    viewButton: {
      padding: '8px 16px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.3s ease',
    },
    activeViewButton: {
      backgroundColor: '#667eea',
      color: 'white',
    },
    createButton: {
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
      transition: 'all 0.3s ease',
    },
    agentsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
      gap: '24px',
    },
    agentCard: {
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    },
    agentHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px',
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
      color: 'white',
    },
    agentName: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '4px',
    },
    parentInfo: {
      fontSize: '12px',
      color: '#6c757d',
      marginBottom: '12px',
    },
    agentDescription: {
      fontSize: '14px',
      color: '#6c757d',
      lineHeight: '1.5',
      marginBottom: '16px',
    },
    statusRow: {
      display: 'flex',
      gap: '8px',
      marginBottom: '16px',
      flexWrap: 'wrap' as const,
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
    },
    statsRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '12px',
      marginBottom: '16px',
    },
    statItem: {
      textAlign: 'center' as const,
    },
    statValue: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#2c3e50',
    },
    statLabel: {
      fontSize: '11px',
      color: '#6c757d',
      textTransform: 'uppercase' as const,
    },
    capabilities: {
      marginBottom: '16px',
    },
    capabilitiesTitle: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#495057',
      marginBottom: '8px',
    },
    capabilityTags: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '4px',
    },
    capabilityTag: {
      padding: '2px 8px',
      backgroundColor: '#e3f2fd',
      color: '#1976d2',
      borderRadius: '12px',
      fontSize: '10px',
      fontWeight: '500',
    },
    actions: {
      display: 'flex',
      gap: '8px',
    },
    actionButton: {
      flex: 1,
      padding: '8px 12px',
      border: 'none',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    primaryButton: {
      backgroundColor: '#667eea',
      color: 'white',
    },
    successButton: {
      backgroundColor: '#28a745',
      color: 'white',
    },
    dangerButton: {
      backgroundColor: '#dc3545',
      color: 'white',
    },
    secondaryButton: {
      backgroundColor: '#e9ecef',
      color: '#495057',
    },
    hierarchyContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px',
    },
    parentSection: {
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    },
    parentHeader: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '16px',
      paddingBottom: '16px',
      borderBottom: '2px solid #f0f0f0',
    },
    parentIcon: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      color: 'white',
      marginRight: '16px',
    },
    parentName: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#2c3e50',
    },
    childrenGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '16px',
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    },
    emptyIcon: {
      fontSize: '64px',
      marginBottom: '16px',
    },
    emptyTitle: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '8px',
    },
    emptyDescription: {
      fontSize: '16px',
      color: '#6c757d',
      marginBottom: '24px',
    },
  };

  const renderChildAgentCard = (agent: ChildAgent) => (
    <div
      key={agent.id}
      style={styles.agentCard}
      onClick={() => navigateToTrainingBoard(agent)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
      }}
    >
      <div style={styles.agentHeader}>
        <div style={styles.agentIcon}>🤖</div>
      </div>

      <div style={styles.agentName}>{agent.name}</div>
      <div style={styles.parentInfo}>
        👤 Parent: {agent.parent_agent_name}
      </div>
      <div style={styles.agentDescription}>{agent.description}</div>

      <div style={styles.statusRow}>
        <span style={{
          ...styles.statusBadge,
          backgroundColor: agent.status === 'active' ? '#d4edda' : agent.status === 'training' ? '#fff3cd' : '#f8f9fa',
          color: getStatusColor(agent.status),
          border: `1px solid ${getStatusColor(agent.status)}30`,
        }}>
          {agent.status}
        </span>
        <span style={{
          ...styles.statusBadge,
          backgroundColor: `${getAutonomyColor(agent.autonomy_level)}20`,
          color: getAutonomyColor(agent.autonomy_level),
          border: `1px solid ${getAutonomyColor(agent.autonomy_level)}30`,
        }}>
          {agent.autonomy_level}
        </span>
        {agent.learning_enabled && (
          <span style={{
            ...styles.statusBadge,
            backgroundColor: '#e3f2fd',
            color: '#1976d2',
            border: '1px solid #1976d230',
          }}>
            Learning
          </span>
        )}
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statItem}>
          <div style={styles.statValue}>{agent.tasks_completed}</div>
          <div style={styles.statLabel}>Tasks</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statValue}>{agent.performance_score}%</div>
          <div style={styles.statLabel}>Performance</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statValue}>{agent.specialization}</div>
          <div style={styles.statLabel}>Specialty</div>
        </div>
      </div>

      <div style={styles.capabilities}>
        <div style={styles.capabilitiesTitle}>Capabilities</div>
        <div style={styles.capabilityTags}>
          {agent.capabilities.map((capability, index) => (
            <span key={index} style={styles.capabilityTag}>
              {capability}
            </span>
          ))}
        </div>
      </div>

      <div style={styles.actions} onClick={(e) => e.stopPropagation()}>
        <button
          style={{ ...styles.actionButton, ...styles.primaryButton }}
          onClick={() => navigateToTrainingBoard(agent)}
        >
          🎓 Train
        </button>
        <button
          style={{ ...styles.actionButton, ...styles.successButton }}
          onClick={() => handleStartTraining(agent.id)}
        >
          ▶️ Start
        </button>
        <button
          style={{ ...styles.actionButton, ...styles.dangerButton }}
          onClick={() => handleDeleteChildAgent(agent)}
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>🤖 Child Agents Management</h1>
          <p style={styles.subtitle}>
            Create, train, and manage specialized child agents linked to parent agents. 
            Build hierarchical AI systems with supervised learning and autonomous capabilities.
          </p>

          <div style={styles.controls}>
            <div style={styles.filtersAndActions}>
              <select
                style={styles.select}
                value={selectedParentFilter || ''}
                onChange={(e) => setSelectedParentFilter(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All Parent Agents</option>
                {parentAgents.map(parent => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </select>

              <div style={styles.viewToggle}>
                <button
                  style={{
                    ...styles.viewButton,
                    ...(viewMode === 'grid' ? styles.activeViewButton : {})
                  }}
                  onClick={() => setViewMode('grid')}
                >
                  📊 Grid View
                </button>
                <button
                  style={{
                    ...styles.viewButton,
                    ...(viewMode === 'hierarchy' ? styles.activeViewButton : {})
                  }}
                  onClick={() => setViewMode('hierarchy')}
                >
                  🌳 Hierarchy
                </button>
              </div>
            </div>

            <button
              style={styles.createButton}
              onClick={() => setShowCreateModal(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
              }}
            >
              ➕ Create Child Agent
            </button>
          </div>
        </div>

        {/* Content */}
        {filteredChildAgents.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🤖</div>
            <h3 style={styles.emptyTitle}>No Child Agents Found</h3>
            <p style={styles.emptyDescription}>
              Create your first child agent to start building specialized AI assistants.
              Child agents inherit capabilities from their parent agents and can be trained for specific tasks.
            </p>
            <button
              style={styles.createButton}
              onClick={() => setShowCreateModal(true)}
            >
              ➕ Create First Child Agent
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={styles.agentsGrid}>
            {filteredChildAgents.map(renderChildAgentCard)}
          </div>
        ) : (
          <div style={styles.hierarchyContainer}>
            {groupedByParent.map(({ parent, children }) => (
              <div key={parent.id} style={styles.parentSection}>
                <div style={styles.parentHeader}>
                  <div style={styles.parentIcon}>🚀</div>
                  <div>
                    <div style={styles.parentName}>{parent.name}</div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>
                      {children.length} Child Agent{children.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                {children.length > 0 ? (
                  <div style={styles.childrenGrid}>
                    {children.map(renderChildAgentCard)}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#6c757d',
                    fontStyle: 'italic'
                  }}>
                    No child agents yet for this parent agent
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Child Agent Modal */}
      {showCreateModal && (
        <CreateChildAgentModal
          parentAgents={parentAgents}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateChildAgent}
        />
      )}
    </div>
  );
};

// Create Child Agent Modal Component
interface CreateChildAgentModalProps {
  parentAgents: ParentAgent[];
  onClose: () => void;
  onCreate: (data: CreateChildAgentData) => void;
}

const CreateChildAgentModal: React.FC<CreateChildAgentModalProps> = ({
  parentAgents,
  onClose,
  onCreate,
}) => {
  const [formData, setFormData] = useState<CreateChildAgentData>({
    name: '',
    description: '',
    parent_agent_id: 0,
    specialization: '',
    capabilities: [],
    autonomy_level: 'supervised',
    learning_enabled: true,
  });

  const [newCapability, setNewCapability] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.parent_agent_id && formData.specialization) {
      onCreate(formData);
    }
  };

  const addCapability = () => {
    if (newCapability.trim() && !formData.capabilities.includes(newCapability.trim())) {
      setFormData(prev => ({
        ...prev,
        capabilities: [...prev.capabilities, newCapability.trim()]
      }));
      setNewCapability('');
    }
  };

  const removeCapability = (capability: string) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.filter(cap => cap !== capability)
    }));
  };

  const modalStyles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    },
    modal: {
      background: 'white',
      borderRadius: '16px',
      padding: '32px',
      maxWidth: '600px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto' as const,
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    },
    header: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '24px',
      textAlign: 'center' as const,
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '20px',
    },
    field: {
      display: 'flex',
      flexDirection: 'column' as const,
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#495057',
      marginBottom: '8px',
    },
    input: {
      padding: '12px',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      fontSize: '14px',
    },
    textarea: {
      padding: '12px',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      fontSize: '14px',
      minHeight: '80px',
      resize: 'vertical' as const,
    },
    select: {
      padding: '12px',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white',
    },
    capabilitiesSection: {
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      padding: '16px',
    },
    capabilityInput: {
      display: 'flex',
      gap: '8px',
      marginBottom: '12px',
    },
    capabilityTags: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '8px',
    },
    capabilityTag: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      backgroundColor: '#e3f2fd',
      color: '#1976d2',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
    },
    removeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#dc3545',
      fontSize: '12px',
    },
    checkboxField: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    checkbox: {
      width: '18px',
      height: '18px',
    },
    actions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px',
    },
    button: {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
    },
    secondaryButton: {
      backgroundColor: '#e9ecef',
      color: '#495057',
    },
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={modalStyles.header}>🤖 Create New Child Agent</h2>
        
        <form style={modalStyles.form} onSubmit={handleSubmit}>
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Agent Name *</label>
            <input
              style={modalStyles.input}
              type="text"
              placeholder="Enter child agent name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Description</label>
            <textarea
              style={modalStyles.textarea}
              placeholder="Describe what this child agent will do"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Parent Agent *</label>
            <select
              style={modalStyles.select}
              value={formData.parent_agent_id}
              onChange={(e) => setFormData(prev => ({ ...prev, parent_agent_id: Number(e.target.value) }))}
              required
            >
              <option value={0}>Select Parent Agent</option>
              {parentAgents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Specialization *</label>
            <input
              style={modalStyles.input}
              type="text"
              placeholder="e.g., customer_support, data_analysis, content_moderation"
              value={formData.specialization}
              onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
              required
            />
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Autonomy Level</label>
            <select
              style={modalStyles.select}
              value={formData.autonomy_level}
              onChange={(e) => setFormData(prev => ({ ...prev, autonomy_level: e.target.value as any }))}
            >
              <option value="supervised">Supervised - Requires approval for actions</option>
              <option value="semi-autonomous">Semi-Autonomous - Some independent actions</option>
              <option value="autonomous">Autonomous - Full independent operation</option>
            </select>
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Capabilities</label>
            <div style={modalStyles.capabilitiesSection}>
              <div style={modalStyles.capabilityInput}>
                <input
                  style={{ ...modalStyles.input, flex: 1 }}
                  type="text"
                  placeholder="Add capability (e.g., chat, analysis, reporting)"
                  value={newCapability}
                  onChange={(e) => setNewCapability(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCapability())}
                />
                <button
                  type="button"
                  style={{ ...modalStyles.button, ...modalStyles.primaryButton }}
                  onClick={addCapability}
                >
                  Add
                </button>
              </div>
              
              {formData.capabilities.length > 0 && (
                <div style={modalStyles.capabilityTags}>
                  {formData.capabilities.map((capability, index) => (
                    <span key={index} style={modalStyles.capabilityTag}>
                      {capability}
                      <button
                        type="button"
                        style={modalStyles.removeButton}
                        onClick={() => removeCapability(capability)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={modalStyles.checkboxField}>
            <input
              style={modalStyles.checkbox}
              type="checkbox"
              id="learning_enabled"
              checked={formData.learning_enabled}
              onChange={(e) => setFormData(prev => ({ ...prev, learning_enabled: e.target.checked }))}
            />
            <label htmlFor="learning_enabled" style={modalStyles.label}>
              Enable Learning (Agent will learn from interactions)
            </label>
          </div>

          <div style={modalStyles.actions}>
            <button
              type="button"
              style={{ ...modalStyles.button, ...modalStyles.secondaryButton }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ ...modalStyles.button, ...modalStyles.primaryButton }}
            >
              Create Child Agent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChildAgentPage; 