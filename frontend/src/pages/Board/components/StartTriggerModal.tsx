import React from 'react';

interface StartTriggerModalProps {
  isOpen: boolean;
  onSelectTrigger: (triggerType: string) => void;
}

export const StartTriggerModal: React.FC<StartTriggerModalProps> = ({
  isOpen,
  onSelectTrigger
}) => {
  if (!isOpen) return null;

  const triggerOptions = [
    {
      id: 'manual',
      icon: '🖱️',
      title: 'Start Manually',
      description: 'Start the agent by clicking a button. Good for testing or quick runs.',
      color: '#667eea'
    },
    {
      id: 'chat',
      icon: '💬',
      title: 'On Chat Message',
      description: 'Start when a user sends a chat message. Useful for AI/chatbot flows.',
      color: '#28a745'
    },
    {
      id: 'email',
      icon: '📧',
      title: 'On Email',
      description: 'Start when an email is received. Useful for automations.',
      color: '#dc3545'
    },
    {
      id: 'webhook',
      icon: '🔗',
      title: 'On Webhook',
      description: 'Start when an HTTP request is received. Integrate with other systems.',
      color: '#fd7e14'
    }
  ];

  const handleTriggerSelect = (triggerType: string) => {
    onSelectTrigger(triggerType);
  };

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        {/* Modal Content */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(247, 249, 252, 0.95))',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          animation: 'modalSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}>
          {/* Header */}
          <div style={{
            padding: '32px 32px 24px 32px',
            textAlign: 'center',
            borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              🚀
            </div>
            <h2 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px',
            }}>
              How do you want to start?
            </h2>
            <p style={{
              margin: 0,
              fontSize: '16px',
              color: '#6c757d',
              lineHeight: '1.5',
            }}>
              Choose how your workflow will be triggered. You can change this later.
            </p>
          </div>

          {/* Trigger Options */}
          <div style={{
            padding: '24px 32px 32px 32px',
          }}>
            <div style={{
              display: 'grid',
              gap: '16px',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            }}>
              {triggerOptions.map((trigger) => (
                <button
                  key={trigger.id}
                  onClick={() => handleTriggerSelect(trigger.id)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: `2px solid ${trigger.color}20`,
                    borderRadius: '16px',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'left',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 16px 40px ${trigger.color}40`;
                    e.currentTarget.style.borderColor = trigger.color;
                    e.currentTarget.style.background = `${trigger.color}08`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.borderColor = `${trigger.color}20`;
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    fontSize: '32px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <span>{trigger.icon}</span>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: trigger.color,
                    }} />
                  </div>

                  {/* Title */}
                  <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#2c3e50',
                  }}>
                    {trigger.title}
                  </h3>

                  {/* Description */}
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#6c757d',
                    lineHeight: '1.4',
                  }}>
                    {trigger.description}
                  </p>

                  {/* Hover Effect Gradient */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(135deg, ${trigger.color}10, transparent)`,
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none',
                  }} />
                </button>
              ))}
            </div>

            {/* Info Note */}
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: 'rgba(102, 126, 234, 0.08)',
              borderRadius: '12px',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: '20px',
                marginBottom: '8px',
              }}>
                💡
              </div>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#495057',
                fontWeight: '500',
              }}>
                <strong>Tip:</strong> Start with "Manual" if you're not sure. You can always change the trigger type later in your workflow settings.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add CSS Animation */}
      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @media (max-width: 768px) {
          .start-trigger-modal {
            margin: 10px !important;
            padding: 20px !important;
          }
          
          .trigger-options-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}; 