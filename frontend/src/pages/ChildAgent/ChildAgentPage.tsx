import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotificationContext } from '../../context/NotificationContext';

interface ChildAgent {
  id: string;
  name: string;
  status: string;
  type: string;
  created_at: string;
}

interface MainAgent {
  id: string;
  name: string;
  type: string;
}

const ChildAgentPage: React.FC = () => {
  const { showSuccess, showError, confirm } = useNotificationContext();
  const [childAgents, setChildAgents] = useState<ChildAgent[]>([]);
  const [mainAgents, setMainAgents] = useState<MainAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedParentFilter, setSelectedParentFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'hierarchy'>('grid');

  useEffect(() => {
    fetchChildAgents();
    fetchMainAgents();
  }, []);

  const fetchChildAgents = async () => {
    try {
      const response = await api.get('/agents/child');
      setChildAgents(response.data);
    } catch (error) {
      console.error('Error fetching child agents:', error);
      setError('Failed to load child agents');
    }
  };

  const fetchMainAgents = async () => {
    try {
      const response = await api.get('/agents/main');
      setMainAgents(response.data);
    } catch (error) {
      console.error('Error fetching main agents:', error);
      setError('Failed to load main agents');
    }
  };

  const createChildAgent = async (data: Partial<ChildAgent>) => {
    setLoading(true);
    try {
      await api.post('/agents/child', data);
      await fetchChildAgents(); // Refresh the list
      setError('');
      showSuccess('Success', `Child Agent "${data.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating child agent:', error);
      setError('Failed to create child agent');
    } finally {
      setLoading(false);
    }
  };

  const trainChildAgent = async (childAgentId: string) => {
    setLoading(true);
    try {
      await api.post(`/agents/${childAgentId}/train`);
      await fetchChildAgents(); // Refresh the list
      setError('');
      showSuccess('Training Started', 'Training for Child Agent has begun.');
    } catch (error) {
      console.error('Error training child agent:', error);
      setError('Failed to train child agent');
    } finally {
      setLoading(false);
    }
  };

  const deleteChildAgent = async (childAgentId: string) => {
    setLoading(true);
    try {
      await api.delete(`/agents/${childAgentId}`);
      await fetchChildAgents(); // Refresh the list
      setError('');
      showSuccess('Deleted', 'Child Agent has been deleted successfully.');
    } catch (error) {
      console.error('Error deleting child agent:', error);
      setError('Failed to delete child agent');
    } finally {
      setLoading(false);
    }
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
    ? childAgents.filter(agent => agent.status === selectedParentFilter)
    : childAgents;

  const groupedByParent = mainAgents.map(parent => ({
    parent,
    children: childAgents.filter(child => child.type === parent.type)
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
      onClick={() => trainChildAgent(agent.id)}
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
        👤 Type: {agent.type}
      </div>
      <div style={styles.agentDescription}>{agent.status}</div>

      <div style={styles.statusRow}>
        <span style={{
          ...styles.statusBadge,
          backgroundColor: getStatusColor(agent.status),
          color: getStatusColor(agent.status),
          border: `1px solid ${getStatusColor(agent.status)}30`,
        }}>
          {agent.status}
        </span>
      </div>

      <div style={styles.actions} onClick={(e) => e.stopPropagation()}>
        <button
          style={{ ...styles.actionButton, ...styles.primaryButton }}
          onClick={(e) => {
            e.stopPropagation();
            trainChildAgent(agent.id);
          }}
        >
          🎓 Train
        </button>
        <button
          style={{ ...styles.actionButton, ...styles.dangerButton }}
          onClick={(e) => {
            e.stopPropagation();
            deleteChildAgent(agent.id);
          }}
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
                onChange={(e) => setSelectedParentFilter(e.target.value)}
              >
                <option value="">All Types</option>
                {mainAgents.map(parent => (
                  <option key={parent.type} value={parent.type}>
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
              <div key={parent.type} style={styles.parentSection}>
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
          mainAgents={mainAgents}
          onClose={() => setShowCreateModal(false)}
          onCreate={createChildAgent}
        />
      )}
    </div>
  );
};

// Create Child Agent Modal Component
interface CreateChildAgentModalProps {
  mainAgents: MainAgent[];
  onClose: () => void;
  onCreate: (data: Partial<ChildAgent>) => void;
}

const CreateChildAgentModal: React.FC<CreateChildAgentModalProps> = ({
  mainAgents,
  onClose,
  onCreate,
}) => {
  const [formData, setFormData] = useState<Partial<ChildAgent>>({
    name: '',
    type: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.type) {
      onCreate(formData);
    }
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
    select: {
      padding: '12px',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white',
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
            <label style={modalStyles.label}>Type *</label>
            <select
              style={modalStyles.select}
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              required
            >
              <option value="">Select Type</option>
              {mainAgents.map(agent => (
                <option key={agent.type} value={agent.type}>
                  {agent.name}
                </option>
              ))}
            </select>
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