import React from 'react';

const LLMsPage: React.FC = () => {
  return (
    <div style={{ padding: '20px', height: '100vh', background: '#f5f5f5' }}>
      <h1 style={{ color: '#333', fontSize: '28px', margin: '0 0 20px 0' }}>LLM Models</h1>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Available Language Models</h3>
          <p className="card-description">Manage and configure AI language models</p>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h4>GPT-4</h4>
              <p style={{ color: '#666', fontSize: '14px' }}>OpenAI's most advanced language model</p>
              <button style={{ marginTop: '8px', padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                Configure
              </button>
            </div>
            <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h4>Claude</h4>
              <p style={{ color: '#666', fontSize: '14px' }}>Anthropic's conversational AI</p>
              <button style={{ marginTop: '8px', padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                Configure
              </button>
            </div>
            <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h4>Gemini</h4>
              <p style={{ color: '#666', fontSize: '14px' }}>Google's multimodal AI</p>
              <button style={{ marginTop: '8px', padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                Configure
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LLMsPage; 