import React from 'react';

const UpdatePage: React.FC = () => {
  return (
    <div style={{ padding: '20px', height: '100vh', background: '#f5f5f5' }}>
      <h1 style={{ color: '#333', fontSize: '28px', margin: '0 0 20px 0' }}>Updates</h1>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">System Updates</h3>
          <p className="card-description">Check for and install updates</p>
        </div>
        <div className="card-content">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h3>You're up to date!</h3>
            <p style={{ color: '#666' }}>Version 1.0.0 is the latest version</p>
            <button style={{ marginTop: '16px', padding: '12px 24px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
              Check for Updates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdatePage; 