import React from 'react';

interface UpdatesTabProps {
  navigate: (path: string) => void;
}

const UpdatesTab: React.FC<UpdatesTabProps> = ({ navigate }) => {
  return (
    <div style={{ padding: '24px 0', maxWidth: 520 }}>
      <h3>Updates</h3>
      <button
        onClick={() => navigate('/update')}
        style={{
          padding: '12px 32px',
          borderRadius: 10,
          background: '#1976d2',
          color: '#fff',
          border: 'none',
          fontWeight: 700,
          fontSize: 17,
          cursor: 'pointer',
          boxShadow: '0 2px 8px #1976d233',
          marginTop: 8,
        }}
      >
        Check for Updates
      </button>
    </div>
  );
};

export default UpdatesTab; 