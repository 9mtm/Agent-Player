import React from 'react';

interface AnalyticsTabProps {}

const AnalyticsTab: React.FC<AnalyticsTabProps> = () => {
  const statCardStyle = {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease',
  };

  const analyticsItems = [
    { title: 'Agent Performance', desc: 'Track individual agent efficiency', icon: '🎯' },
    { title: 'Usage Patterns', desc: 'Analyze usage trends over time', icon: '📈' },
    { title: 'Resource Optimization', desc: 'Monitor system resource usage', icon: '⚡' },
    { title: 'Cost Analysis', desc: 'API costs and optimization tips', icon: '💰' },
  ];

  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
      <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50', marginBottom: '12px' }}>
        Advanced Analytics
      </h2>
      <p style={{ fontSize: '16px', color: '#6c757d', marginBottom: '24px' }}>
        Detailed performance metrics and insights coming soon...
      </p>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginTop: '40px',
      }}>
        {analyticsItems.map((item, index) => (
          <div key={index} style={{ 
            ...statCardStyle, 
            textAlign: 'center',
            opacity: 0.7,
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>{item.icon}</div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
              {item.title}
            </h3>
            <p style={{ fontSize: '14px', color: '#6c757d' }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsTab; 