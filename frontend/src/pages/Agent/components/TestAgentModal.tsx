import React, { useState } from 'react';
import { agentsService } from '../../../services/agents';

interface TestAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentName: string;
  agentId: number;
}

interface TestResponse {
  success: boolean;
  result?: {
    message?: string;
    data?: {
      response?: string;
      [key: string]: unknown;
    } | null;
    status?: string;
    agent_name?: string;
    model?: string;
    user_message?: string;
    ai_response?: string;
    response_time?: string;
    usage?: {
      total_tokens: number;
      prompt_tokens: number;
      completion_tokens: number;
    };
  };
  message?: string;
  error?: string;
}

const TestAgentModal: React.FC<TestAgentModalProps> = ({
  isOpen,
  onClose,
  agentName,
  agentId
}) => {
  const [testMessage, setTestMessage] = useState('Hello! Can you help me with a quick test?');
  const [openaiKey, setOpenaiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResponse | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const handleTest = async () => {
    if (!testMessage.trim()) {
      alert('Please enter a test message');
      return;
    }

    if (showApiKeyInput && !openaiKey.trim()) {
      alert('Please enter your OpenAI API Key');
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const result = await agentsService.testAgent(agentId, testMessage);

      // Debug: Enhanced logging
      console.log('🔍 Test Agent Response (Full):', JSON.stringify(result, null, 2));
      console.log('🔍 Response Success:', result.success);
      console.log('🔍 Response Data Exists:', !!result.result);
      
      const responseData: TestResponse = {
        success: result.success,
        result: result.result,
        message: result.error || (result.success ? 'Test successful' : 'Test failed'),
      };

      // If failed due to missing API key, show the API key input for manual override
      if (!responseData.success && responseData.message?.includes('API key')) {
        setShowApiKeyInput(true);
        // Update the result message to be more informative
        setTestResult({
          ...responseData,
          message: 'No API key found for this agent. Please enter your OpenAI API key below to test the agent.'
        });
      } else {
        // Force state update with small delay to ensure re-render
        setTimeout(() => {
          console.log('🔄 Setting test result:', responseData);
          setTestResult(responseData);
        }, 50);
      }

    } catch (error) {
      console.error('Test error:', error);
      setTestResult({
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTestResult(null);
    onClose();
  };

  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: '2px solid #f0f0f0',
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#2c3e50',
      margin: 0,
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#666',
      padding: '0',
      width: '30px',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    form: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#333',
      marginBottom: '8px',
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '2px solid #e1e5e9',
      borderRadius: '8px',
      fontSize: '14px',
      marginBottom: '16px',
      outline: 'none',
      transition: 'border-color 0.3s ease',
    },
    textarea: {
      width: '100%',
      padding: '12px',
      border: '2px solid #e1e5e9',
      borderRadius: '8px',
      fontSize: '14px',
      marginBottom: '16px',
      outline: 'none',
      resize: 'vertical' as const,
      minHeight: '80px',
      transition: 'border-color 0.3s ease',
    },
    button: {
      backgroundColor: '#667eea',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      width: '100%',
      marginTop: '10px',
    },
    buttonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed',
    },
    result: {
      marginTop: '20px',
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid #e1e5e9',
    },
    successResult: {
      backgroundColor: '#f8fff9',
      borderColor: '#28a745',
    },
    errorResult: {
      backgroundColor: '#fff8f8',
      borderColor: '#dc3545',
    },
    resultTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      marginBottom: '12px',
    },
    successTitle: {
      color: '#28a745',
    },
    errorTitle: {
      color: '#dc3545',
    },
    resultContent: {
      fontSize: '14px',
      lineHeight: '1.5',
    },
    messageBox: {
      backgroundColor: '#f8f9fa',
      padding: '12px',
      borderRadius: '6px',
      marginBottom: '8px',
      border: '1px solid #e9ecef',
    },
    responseBox: {
      backgroundColor: '#e8f5e8',
      padding: '12px',
      borderRadius: '6px',
      marginTop: '8px',
      border: '1px solid #c3e6c3',
    },
    loader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    },
    spinner: {
      width: '20px',
      height: '20px',
      border: '2px solid #f3f3f3',
      borderTop: '2px solid #667eea',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
  };

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>🧪 Test Agent: {agentName}</h2>
          <button style={styles.closeButton} onClick={handleClose}>×</button>
        </div>

        <div style={styles.form}>
          {!showApiKeyInput && (
            <div style={{ 
              backgroundColor: '#e8f5e8', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '16px',
              border: '1px solid #c3e6c3',
              fontSize: '14px',
              color: '#155724'
            }}>
              ✅ This agent will use its configured API key for testing
            </div>
          )}

          {showApiKeyInput && (
            <>
              <label style={styles.label}>🔑 OpenAI API Key Override:</label>
              <input
                type="password"
                style={styles.input}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="Enter your OpenAI API Key here..."
              />
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
                💡 No API key found for this agent. Please enter your OpenAI API key to test.
              </div>
            </>
          )}

          <label style={styles.label}>💬 Test Message:</label>
          <textarea
            style={styles.textarea}
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter the message you want to test the agent with..."
          />

          <button
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {}),
            }}
            onClick={handleTest}
            disabled={isLoading}
          >
            {isLoading ? (
              <div style={styles.loader}>
                <div style={styles.spinner}></div>
                <span style={{ marginLeft: '10px' }}>Testing Agent...</span>
              </div>
            ) : (
              '🚀 Test Agent'
            )}
          </button>
        </div>

        {testResult && (
          <div
            style={{
              ...styles.result,
              ...(testResult.success && !testResult.result?.message?.includes("Invalid") ? styles.successResult : styles.errorResult),
            }}
          >
            <div
              style={{
                ...styles.resultTitle,
                ...(testResult.success && !testResult.result?.message?.includes("Invalid") ? styles.successTitle : styles.errorTitle),
              }}
            >
              {testResult.success && !testResult.result?.message?.includes("Invalid") ? '✅ Test Successful!' : '❌ Test Failed'}
            </div>
            
            <div style={styles.resultContent}>
              {testResult.success ? (
                <>
                  {testResult.result?.message ? (
                    <div style={styles.messageBox}>
                      <strong>Message:</strong><br />
                      {testResult.result.message}
                    </div>
                  ) : (
                    <>
                      {testResult.result?.agent_name && (
                        <div><strong>🤖 Agent:</strong> {testResult.result.agent_name}</div>
                      )}
                      {testResult.result?.model && (
                        <div><strong>🧠 Model:</strong> {testResult.result.model}</div>
                      )}
                      {testResult.result?.response_time && (
                        <div><strong>⏱️ Response Time:</strong> {testResult.result.response_time}</div>
                      )}
                      
                      <div style={styles.messageBox}>
                        <strong>👤 Your Message:</strong><br />
                        {testResult.result?.user_message || testMessage}
                      </div>
                      
                      <div style={styles.responseBox}>
                        <strong>🤖 Agent Response:</strong><br />
                        {testResult.result?.ai_response || testResult.result?.data?.response || 'No response'}
                      </div>

                      {testResult.result?.usage && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                          📊 Usage: {testResult.result.usage.total_tokens} tokens ({testResult.result.usage.prompt_tokens} prompt + {testResult.result.usage.completion_tokens} completion)
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div><strong>Error Message:</strong> {testResult.error || testResult.message || 'Unknown error'}</div>
                </>
              )}
            </div>
          </div>
        )}

        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default TestAgentModal; 