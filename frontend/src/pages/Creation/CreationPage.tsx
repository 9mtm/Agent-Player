import React, { useState } from 'react';

const CreationPage: React.FC = () => {
  const [projectType, setProjectType] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  const projectTypes = [
    { id: 'workflow', name: 'Workflow', description: 'Create automated workflows', icon: '🔄' },
    { id: 'agent', name: 'AI Agent', description: 'Build intelligent agents', icon: '🤖' },
    { id: 'chat', name: 'Chat Bot', description: 'Design conversational interfaces', icon: '💬' },
    { id: 'form', name: 'Form Builder', description: 'Create interactive forms', icon: '📝' },
  ];

  const handleCreate = () => {
    console.log('Creating project:', { projectType, projectName, projectDescription });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Create New Project</h1>
          <p className="page-subtitle">Start building your next automation or AI solution</p>
        </div>
      </div>
      <div className="page-content">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Project Type</h2>
              <p className="card-description">Choose what you want to create</p>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-1 gap-3">
                {projectTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setProjectType(type.id)}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      projectType === type.id
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{type.icon}</span>
                      <div>
                        <h3 className="font-semibold">{type.name}</h3>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Project Details</h2>
              <p className="card-description">Provide basic information about your project</p>
            </div>
            <div className="card-content">
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input form-textarea"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Describe your project..."
                  rows={4}
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={!projectType || !projectName}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreationPage; 