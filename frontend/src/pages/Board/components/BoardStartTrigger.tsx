import React from 'react';

interface BoardStartTriggerProps {
  onSelect: (type: string) => void;
}

const triggers = [
  {
    type: 'manual',
    label: 'Start Manually',
    desc: 'Start the agent by clicking a button. Good for testing or quick runs.',
    icon: '🖱️',
  },
  {
    type: 'chat',
    label: 'On Chat Message',
    desc: 'Start when a user sends a chat message. Useful for AI/chatbot flows.',
    icon: '💬',
  },
  {
    type: 'email',
    label: 'On Email',
    desc: 'Start when an email is received. Useful for automations.',
    icon: '📧',
  },
  {
    type: 'webhook',
    label: 'On Webhook',
    desc: 'Start when an HTTP request is received. Integrate with other systems.',
    icon: '🔗',
  },
];

const BoardStartTrigger: React.FC<BoardStartTriggerProps> = ({ onSelect }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      background: 'var(--board-bg, #f7f7f7)',
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 2000,
    }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1976d2', marginBottom: 18 }}>How do you want to start?</h2>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
        {triggers.map(trigger => (
          <button
            key={trigger.type}
            onClick={() => onSelect(trigger.type)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              border: '2px solid #1976d2',
              borderRadius: 16,
              padding: '32px 28px',
              minWidth: 180,
              minHeight: 180,
              boxShadow: '0 2px 16px #1976d211',
              cursor: 'pointer',
              transition: 'border 0.15s, box-shadow 0.15s',
              fontSize: 18,
              fontWeight: 600,
              color: '#222',
              margin: 8,
            }}
            tabIndex={0}
            aria-label={trigger.label}
          >
            <span style={{ fontSize: 48, marginBottom: 18 }}>{trigger.icon}</span>
            <span style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>{trigger.label}</span>
            <span style={{ color: '#555', fontSize: 15, textAlign: 'center', maxWidth: 180 }}>{trigger.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BoardStartTrigger; 