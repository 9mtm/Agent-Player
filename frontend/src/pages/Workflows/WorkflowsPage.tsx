import React, { useState, useEffect } from 'react';
import { workflowsService } from '../../services';
import type { Workflow, WorkflowAnalytics } from '../../services/workflows';

const WorkflowsPage: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [analytics, setAnalytics] = useState<WorkflowAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [workflowsData, analyticsData] = await Promise.all([
        workflowsService.getWorkflows({ limit: 50 }),
        workflowsService.getAnalytics('30')
      ]);
      
      setWorkflows(workflowsData.workflows || []);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load workflows data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteWorkflow = async (workflowId: number) => {
    try {
      const execution = await workflowsService.executeWorkflow(workflowId, {});
      console.log('Workflow executed:', execution);
      // Show success notification
      alert('Workflow executed successfully!');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      alert('Failed to execute workflow. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="page workflows-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading Workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page workflows-page">
      <div className="page-header">
        <h1>Workflow Automation</h1>
        <p>Create and manage automated business processes</p>
        <button className="btn btn-primary">
          <i className="icon-plus"></i>
          Create Workflow
        </button>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <div className="card-icon">
              <i className="icon-workflow"></i>
            </div>
            <div className="card-content">
              <h3>{analytics.total_workflows || 0}</h3>
              <p>Total Workflows</p>
            </div>
          </div>
          
          <div className="analytics-card">
            <div className="card-icon">
              <i className="icon-play"></i>
            </div>
            <div className="card-content">
              <h3>{analytics.active_workflows || 0}</h3>
              <p>Active Workflows</p>
            </div>
          </div>
          
          <div className="analytics-card">
            <div className="card-icon">
              <i className="icon-check"></i>
            </div>
            <div className="card-content">
              <h3>{analytics.successful_executions || 0}</h3>
              <p>Successful Runs</p>
            </div>
          </div>
          
          <div className="analytics-card">
            <div className="card-icon">
              <i className="icon-percentage"></i>
            </div>
            <div className="card-content">
              <h3>{analytics.success_rate ? Math.round(analytics.success_rate * 100) : 0}%</h3>
              <p>Success Rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Workflows Grid */}
      <div className="workflows-container">
        {workflows.length === 0 ? (
          <div className="empty-state">
            <i className="icon-workflow-empty"></i>
            <h3>No workflows found</h3>
            <p>Create your first workflow to automate your processes</p>
            <button className="btn btn-primary">
              Create Workflow
            </button>
          </div>
        ) : (
          <div className="workflows-grid">
            {workflows.map(workflow => (
              <div key={workflow.id} className="workflow-card">
                <div className="workflow-header">
                  <h4>{workflow.name}</h4>
                  <div className={`status-badge status-${workflow.status}`}>
                    {workflow.status}
                  </div>
                </div>
                
                <p className="workflow-description">
                  {workflow.description || 'No description provided'}
                </p>
                
                <div className="workflow-stats">
                  <div className="stat">
                    <span className="label">Nodes:</span>
                    <span className="value">{workflow.node_count || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Executions:</span>
                    <span className="value">{workflow.execution_count || 0}</span>
                  </div>
                </div>
                
                <div className="workflow-tags">
                  {workflow.tags?.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="workflow-actions">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => window.location.href = `/workflows/${workflow.id}`}
                  >
                    <i className="icon-edit"></i>
                    Edit
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleExecuteWorkflow(workflow.id)}
                  >
                    <i className="icon-play"></i>
                    Execute
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowsPage; 