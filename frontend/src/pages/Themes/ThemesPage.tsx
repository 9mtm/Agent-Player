import React, { useState } from 'react';

const ThemesPage: React.FC = () => {
  const [selectedTheme, setSelectedTheme] = useState('light');

  const themes = [
    { id: 'light', name: 'Light Theme', preview: '#ffffff' },
    { id: 'dark', name: 'Dark Theme', preview: '#1a1a1a' },
    { id: 'blue', name: 'Blue Theme', preview: '#1976d2' },
    { id: 'green', name: 'Green Theme', preview: '#4caf50' }
  ];

  return (
    <div style={{ padding: '20px', height: '100vh', background: '#f5f5f5' }}>
      <h1 style={{ color: '#333', fontSize: '28px', margin: '0 0 20px 0' }}>Themes</h1>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Choose Your Theme</h3>
          <p className="card-description">Customize the appearance of your workspace</p>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {themes.map(theme => (
              <div 
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                style={{
                  padding: '16px',
                  background: '#fff',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  border: selectedTheme === theme.id ? '2px solid #007bff' : '2px solid transparent',
                  cursor: 'pointer'
                }}
              >
                <div style={{ width: '100%', height: '60px', background: theme.preview, borderRadius: '4px', marginBottom: '8px' }} />
                <h4>{theme.name}</h4>
                {selectedTheme === theme.id && <span style={{ color: '#007bff', fontSize: '12px' }}>✓ Selected</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemesPage; 