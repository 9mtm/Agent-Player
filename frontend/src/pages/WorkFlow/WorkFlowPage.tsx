import React, { useState, useEffect } from 'react';
import { useNotificationContext } from '../../context/NotificationContext';
import configUtils from '../../utils/configUtils';

interface Board {
  id: number;
  name: string;
  description: string;
  agent_id: number;
  agent_name: string;
  nodes_count: number;
  edges_count: number;
  status: 'active' | 'inactive';
}

interface Workflow {
  id: number;
  name: string;
  description: string;
  board_id: number;
  board_name: string;
  trigger_type: 'manual' | 'scheduled' | 'event';
  is_active: boolean;
  executions_count: number;
  success_rate: number;
  last_execution: string | null;
  created_at: string;
}

interface CreateWorkflowData {
  name: string;
  description: string;
  board_id: number;
  trigger_type: 'manual' | 'scheduled' | 'event';
  steps: string[];
  is_active: boolean;
}

interface WorkflowExecution {
  execution_id: string;
  workflow_id: number;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  success: boolean;
  steps_executed: number;
  steps_total: number;
}

const WorkFlowPage: React.FC = () => {
  const { showSuccess, showError, confirm } = useNotificationContext();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [showExecutionsModal, setShowExecutionsModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Fetch data on component mount
  useEffect(() => {
    fetchWorkflows();
    fetchBoards();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch(configUtils.getApiUrl('/workflows'));
      const result = await response.json();
      if (result.success) {
        setWorkflows(result.data);
      } else {
        showError('Error', 'Failed to fetch workflows');
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
      showError('Error', 'Network error while fetching workflows');
    }
  };

  const fetchBoards = async () => {
    try {
      const response = await fetch(configUtils.getApiUrl('/boards'));
      const result = await response.json();
      if (result.success) {
        setBoards(result.data);
      } else {
        showError('Error', 'Failed to fetch boards');
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
      showError('Error', 'Network error while fetching boards');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async (workflowData: Omit<Workflow, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch(configUtils.getApiUrl('/workflows'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData),
      });

      const result = await response.json();
      if (result.success) {
        setWorkflows([...workflows, result.data]);
        setShowCreateModal(false);
        showSuccess('Success', 'Workflow created successfully');
      } else {
        showError('Error', 'Failed to create workflow');
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
      showError('Error', 'Network error while creating workflow');
    }
  };

  const executeWorkflow = async (workflow: Workflow) => {
    try {
      const response = await fetch(configUtils.getApiUrl(`/workflows/${workflow.id}/execute`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (result.success) {
        showSuccess('Success', `Workflow "${workflow.name}" executed successfully`);
        // Fetch updated executions
        fetchExecutions(workflow.id);
      } else {
        showError('Error', 'Failed to execute workflow');
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
      showError('Error', 'Network error while executing workflow');
    }
  };

  const fetchExecutions = async (workflowId: number) => {
    try {
      const response = await fetch(configUtils.getApiUrl(`/workflows/${workflowId}/executions`));
      const result = await response.json();
      if (result.success) {
        setExecutions(result.data);
      }
    } catch (error) {
      console.error('Error fetching executions:', error);
    }
  };

  const handleViewExecutions = async (workflow: Workflow) => {
    try {
      const response = await fetch(configUtils.getApiUrl(`/workflows/${workflow.id}/executions`));
      const result = await response.json();
      if (result.success) {
        setExecutions(result.data);
        setSelectedWorkflow(workflow);
        setShowExecutionsModal(true);
      } else {
        showError('Error', result.message || 'Failed to fetch executions');
      }
    } catch (error) {
      console.error('Error fetching executions:', error);
      showError('Error', 'Network error while fetching executions');
    }
  };

  const navigateToBoard = (boardId: number, boardName: string) => {
    window.location.href = `/board?id=${boardId}&name=${encodeURIComponent(boardName)}`;
  };

  const getTriggerColor = (trigger: string) => {
    switch (trigger) {
      case 'manual': return '#17a2b8';
      case 'scheduled': return '#28a745';
      case 'event': return '#fd7e14';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? '#28a745' : '#6c757d';
  };

  const filteredWorkflows = workflows.filter(workflow => {
    if (filterStatus === 'active') return workflow.is_active;
    if (filterStatus === 'inactive') return !workflow.is_active;
    return true;
  });

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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
          <div style={{ fontSize: '18px' }}>Loading Workflows...</div>
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
    statsRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
    },
    statCard: {
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
      textAlign: 'center' as const,
    },
    statValue: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#2c3e50',
      marginBottom: '4px',
    },
    statLabel: {
      fontSize: '12px',
      color: '#6c757d',
      textTransform: 'uppercase' as const,
      fontWeight: '600',
    },
    workflowsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
      gap: '24px',
    },
    workflowsList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
    },
    workflowCard: {
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    },
    workflowHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px',
    },
    workflowIcon: {
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
    workflowName: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '4px',
    },
    boardInfo: {
      fontSize: '12px',
      color: '#6c757d',
      marginBottom: '12px',
    },
    workflowDescription: {
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
    metricsRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '12px',
      marginBottom: '16px',
    },
    metricItem: {
      textAlign: 'center' as const,
    },
    metricValue: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#2c3e50',
    },
    metricLabel: {
      fontSize: '10px',
      color: '#6c757d',
      textTransform: 'uppercase' as const,
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
    infoButton: {
      backgroundColor: '#17a2b8',
      color: 'white',
    },
    secondaryButton: {
      backgroundColor: '#e9ecef',
      color: '#495057',
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

  const renderWorkflowCard = (workflow: Workflow) => (
    <div
      key={workflow.id}
      style={styles.workflowCard}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
      }}
    >
      <div style={styles.workflowHeader}>
        <div style={styles.workflowIcon}>⚡</div>
      </div>

      <div style={styles.workflowName}>{workflow.name}</div>
      <div style={styles.boardInfo}>
        🏗️ Board: {workflow.board_name}
      </div>
      <div style={styles.workflowDescription}>{workflow.description}</div>

      <div style={styles.statusRow}>
        <span style={{
          ...styles.statusBadge,
          backgroundColor: workflow.is_active ? '#d4edda' : '#f8f9fa',
          color: getStatusColor(workflow.is_active),
          border: `1px solid ${getStatusColor(workflow.is_active)}30`,
        }}>
          {workflow.is_active ? 'Active' : 'Inactive'}
        </span>
        <span style={{
          ...styles.statusBadge,
          backgroundColor: `${getTriggerColor(workflow.trigger_type)}20`,
          color: getTriggerColor(workflow.trigger_type),
          border: `1px solid ${getTriggerColor(workflow.trigger_type)}30`,
        }}>
          {workflow.trigger_type}
        </span>
      </div>

      <div style={styles.metricsRow}>
        <div style={styles.metricItem}>
          <div style={styles.metricValue}>{workflow.executions_count}</div>
          <div style={styles.metricLabel}>Executions</div>
        </div>
        <div style={styles.metricItem}>
          <div style={styles.metricValue}>{workflow.success_rate.toFixed(1)}%</div>
          <div style={styles.metricLabel}>Success Rate</div>
        </div>
        <div style={styles.metricItem}>
          <div style={styles.metricValue}>
            {workflow.last_execution ? new Date(workflow.last_execution).toLocaleDateString() : 'Never'}
          </div>
          <div style={styles.metricLabel}>Last Run</div>
        </div>
      </div>

      <div style={styles.actions} onClick={(e) => e.stopPropagation()}>
        <button
          style={{ ...styles.actionButton, ...styles.successButton }}
          onClick={() => executeWorkflow(workflow)}
          disabled={!workflow.is_active}
        >
          ▶️ Execute
        </button>
        <button
          style={{ ...styles.actionButton, ...styles.infoButton }}
          onClick={() => handleViewExecutions(workflow)}
        >
          📊 History
        </button>
        <button
          style={{ ...styles.actionButton, ...styles.primaryButton }}
          onClick={() => navigateToBoard(workflow.board_id, workflow.board_name)}
        >
          🏗️ Board
        </button>
      </div>
    </div>
  );

  const totalWorkflows = workflows.length;
  const activeWorkflows = workflows.filter(w => w.is_active).length;
  const totalExecutions = workflows.reduce((sum, w) => sum + w.executions_count, 0);
  const avgSuccessRate = workflows.length > 0 
    ? workflows.reduce((sum, w) => sum + w.success_rate, 0) / workflows.length 
    : 0;

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>⚡ Workflow Management</h1>
          <p style={styles.subtitle}>
            Create, execute, and monitor automated workflows. Connect boards to create powerful 
            automation pipelines for your AI agents.
          </p>

          <div style={styles.controls}>
            <div style={styles.filtersAndActions}>
              <select
                style={styles.select}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">All Workflows</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
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
                    ...(viewMode === 'list' ? styles.activeViewButton : {})
                  }}
                  onClick={() => setViewMode('list')}
                >
                  📋 List View
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
              ➕ Create Workflow
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{totalWorkflows}</div>
            <div style={styles.statLabel}>Total Workflows</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{activeWorkflows}</div>
            <div style={styles.statLabel}>Active Workflows</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{totalExecutions}</div>
            <div style={styles.statLabel}>Total Executions</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{avgSuccessRate.toFixed(1)}%</div>
            <div style={styles.statLabel}>Average Success Rate</div>
          </div>
        </div>

        {/* Content */}
        {filteredWorkflows.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>⚡</div>
            <h3 style={styles.emptyTitle}>No Workflows Found</h3>
            <p style={styles.emptyDescription}>
              Create your first workflow to automate tasks and processes. 
              Workflows connect to training boards and execute automated sequences.
            </p>
            <button
              style={styles.createButton}
              onClick={() => setShowCreateModal(true)}
            >
              ➕ Create First Workflow
            </button>
          </div>
        ) : (
          <div style={viewMode === 'grid' ? styles.workflowsGrid : styles.workflowsList}>
            {filteredWorkflows.map(renderWorkflowCard)}
          </div>
        )}
      </div>

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <CreateWorkflowModal
          boards={boards}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateWorkflow}
        />
      )}

      {/* Executions Modal */}
      {showExecutionsModal && selectedWorkflow && (
        <ExecutionsModal
          workflow={selectedWorkflow}
          executions={executions}
          onClose={() => setShowExecutionsModal(false)}
        />
      )}
    </div>
  );
};

// Create Workflow Modal Component
interface CreateWorkflowModalProps {
  boards: Board[];
  onClose: () => void;
  onCreate: (data: CreateWorkflowData) => void;
}

const CreateWorkflowModal: React.FC<CreateWorkflowModalProps> = ({
  boards,
  onClose,
  onCreate,
}) => {
  const [formData, setFormData] = useState<CreateWorkflowData>({
    name: '',
    description: '',
    board_id: 0,
    trigger_type: 'manual',
    steps: [],
    is_active: true,
  });

  const [newStep, setNewStep] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.board_id) {
      onCreate(formData);
    }
  };

  const addStep = () => {
    if (newStep.trim() && !formData.steps.includes(newStep.trim())) {
      setFormData(prev => ({
        ...prev,
        steps: [...prev.steps, newStep.trim()]
      }));
      setNewStep('');
    }
  };

  const removeStep = (step: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter(s => s !== step)
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
    stepsSection: {
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      padding: '16px',
    },
    stepInput: {
      display: 'flex',
      gap: '8px',
      marginBottom: '12px',
    },
    stepTags: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '8px',
    },
    stepTag: {
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
        <h2 style={modalStyles.header}>⚡ Create New Workflow</h2>
        
        <form style={modalStyles.form} onSubmit={handleSubmit}>
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Workflow Name *</label>
            <input
              style={modalStyles.input}
              type="text"
              placeholder="Enter workflow name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Description</label>
            <textarea
              style={modalStyles.textarea}
              placeholder="Describe what this workflow does"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Training Board *</label>
            <select
              style={modalStyles.select}
              value={formData.board_id}
              onChange={(e) => setFormData(prev => ({ ...prev, board_id: Number(e.target.value) }))}
              required
            >
              <option value={0}>Select Training Board</option>
              {boards.map(board => (
                <option key={board.id} value={board.id}>
                  {board.name} ({board.agent_name})
                </option>
              ))}
            </select>
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Trigger Type</label>
            <select
              style={modalStyles.select}
              value={formData.trigger_type}
              onChange={(e) => setFormData(prev => ({ ...prev, trigger_type: e.target.value as any }))}
            >
              <option value="manual">Manual - Start manually when needed</option>
              <option value="scheduled">Scheduled - Run on schedule</option>
              <option value="event">Event - Trigger on specific events</option>
            </select>
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Workflow Steps</label>
            <div style={modalStyles.stepsSection}>
              <div style={modalStyles.stepInput}>
                <input
                  style={{ ...modalStyles.input, flex: 1 }}
                  type="text"
                  placeholder="Add workflow step (e.g., validate input, process data, send notification)"
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStep())}
                />
                <button
                  type="button"
                  style={{ ...modalStyles.button, ...modalStyles.primaryButton }}
                  onClick={addStep}
                >
                  Add
                </button>
              </div>
              
              {formData.steps.length > 0 && (
                <div style={modalStyles.stepTags}>
                  {formData.steps.map((step, index) => (
                    <span key={index} style={modalStyles.stepTag}>
                      {step}
                      <button
                        type="button"
                        style={modalStyles.removeButton}
                        onClick={() => removeStep(step)}
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
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
            />
            <label htmlFor="is_active" style={modalStyles.label}>
              Activate immediately (Workflow will be ready to execute)
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
              Create Workflow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Executions Modal Component
interface ExecutionsModalProps {
  workflow: Workflow;
  executions: WorkflowExecution[];
  onClose: () => void;
}

const ExecutionsModal: React.FC<ExecutionsModalProps> = ({
  workflow,
  executions,
  onClose,
}) => {
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
      maxWidth: '800px',
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
    executionsList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
    },
    executionItem: {
      padding: '16px',
      border: '2px solid #f0f0f0',
      borderRadius: '12px',
      backgroundColor: '#f8f9fa',
    },
    executionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
    },
    executionId: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#495057',
    },
    executionStatus: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
    },
    executionDetails: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '12px',
      fontSize: '12px',
      color: '#6c757d',
    },
    closeButton: {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      backgroundColor: '#e9ecef',
      color: '#495057',
      marginTop: '24px',
      width: '100%',
    },
  };

  const getExecutionStatusColor = (status: string, success: boolean) => {
    if (status === 'running') return { bg: '#fff3cd', color: '#856404' };
    if (status === 'completed' && success) return { bg: '#d4edda', color: '#155724' };
    return { bg: '#f8d7da', color: '#721c24' };
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={modalStyles.header}>📊 Execution History: {workflow.name}</h2>
        
        {executions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <div>No executions yet for this workflow</div>
          </div>
        ) : (
          <div style={modalStyles.executionsList}>
            {executions.map((execution) => {
              const statusColor = getExecutionStatusColor(execution.status, execution.success);
              return (
                <div key={execution.execution_id} style={modalStyles.executionItem}>
                  <div style={modalStyles.executionHeader}>
                    <div style={modalStyles.executionId}>
                      {execution.execution_id}
                    </div>
                    <div style={{
                      ...modalStyles.executionStatus,
                      backgroundColor: statusColor.bg,
                      color: statusColor.color,
                    }}>
                      {execution.status}
                    </div>
                  </div>
                  <div style={modalStyles.executionDetails}>
                    <div>
                      <strong>Started:</strong><br />
                      {new Date(execution.started_at).toLocaleString()}
                    </div>
                    {execution.completed_at && (
                      <div>
                        <strong>Completed:</strong><br />
                        {new Date(execution.completed_at).toLocaleString()}
                      </div>
                    )}
                    {execution.duration_seconds && (
                      <div>
                        <strong>Duration:</strong><br />
                        {execution.duration_seconds}s
                      </div>
                    )}
                    <div>
                      <strong>Steps:</strong><br />
                      {execution.steps_executed}/{execution.steps_total}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <button
          style={modalStyles.closeButton}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default WorkFlowPage; 