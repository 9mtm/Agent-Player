import React from 'react';

const ToolsPage: React.FC = () => {
  const tools = [
    { name: 'Code Generator', description: 'Generate code snippets', icon: '💻' },
    { name: 'Data Analyzer', description: 'Analyze datasets', icon: '📊' },
    { name: 'Text Processor', description: 'Process text content', icon: '📝' },
    { name: 'Image Generator', description: 'Create AI images', icon: '🎨' }
  ];

  return (
    <div style={{ padding: '20px', height: '100vh', background: '#f5f5f5' }}>
      <h1 style={{ color: '#333', fontSize: '28px', margin: '0 0 20px 0' }}>Tools</h1>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Available Tools</h3>
          <p className="card-description">Productivity tools and utilities</p>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {tools.map(tool => (
              <div key={tool.name} style={{ padding: '16px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{tool.icon}</div>
                <h4>{tool.name}</h4>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>{tool.description}</p>
                <button style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                  Use Tool
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsPage; 