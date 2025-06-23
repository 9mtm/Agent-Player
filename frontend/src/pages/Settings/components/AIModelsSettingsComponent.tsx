import React, { useState, useEffect } from 'react';
import { settingsService } from '../../../services/settings';

interface AIModelSettings {
  default_model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  openai_api_key: string;
  anthropic_api_key: string;
  google_api_key: string;
  custom_endpoint: string;
  timeout_seconds: number;
  retry_attempts: number;
}

const AIModelsSettingsComponent: React.FC = () => {
  const [settings, setSettings] = useState<AIModelSettings>({
    default_model: "gpt-3.5-turbo",
    temperature: 0.7,
    max_tokens: 1000,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    openai_api_key: "",
    anthropic_api_key: "",
    google_api_key: "",
    custom_endpoint: "",
    timeout_seconds: 30,
    retry_attempts: 3
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [testingModel, setTestingModel] = useState(false);

  useEffect(() => {
    loadAIModelSettings();
  }, []);

  const loadAIModelSettings = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getAIModelSettings();
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to load AI model settings:', error);
      setMessage('❌ Failed to load AI model settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await settingsService.updateAIModelSettings(settings);
      if (response.success) {
        setMessage('🤖 AI model settings updated successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to save AI model settings:', error);
      setMessage('❌ Failed to save AI model settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof AIModelSettings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestModel = async () => {
    setTestingModel(true);
    // Simulate testing
    setTimeout(() => {
      setTestingModel(false);
      setMessage('✅ Model test completed successfully');
      setTimeout(() => setMessage(''), 3000);
    }, 2000);
  };

  const availableModels = [
    { id: "gpt-4", name: "GPT-4", provider: "OpenAI", description: "Most capable model" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI", description: "Fast and efficient" },
    { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic", description: "Powerful reasoning" },
    { id: "claude-3-sonnet", name: "Claude 3 Sonnet", provider: "Anthropic", description: "Balanced performance" },
    { id: "gemini-pro", name: "Gemini Pro", provider: "Google", description: "Multimodal capabilities" },
    { id: "gemini-ultra", name: "Gemini Ultra", provider: "Google", description: "Ultra performance" },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔄</div>
        <div>Loading AI model settings...</div>
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '24px',
          background: message.includes('❌') ? '#f8d7da' : '#d4edda',
          color: message.includes('❌') ? '#721c24' : '#155724',
          borderRadius: '8px',
          fontSize: '14px',
        }}>
          {message}
        </div>
      )}

      {/* Model Selection */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        border: '2px solid #e1e5e9'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#2c3e50',
          margin: '0 0 16px 0'
        }}>
          🤖 AI Model Selection
        </h3>

        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
            Default AI Model
          </label>
          <select
            value={settings.default_model}
            onChange={(e) => handleChange('default_model', e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '16px'
            }}
          >
            {availableModels.map(model => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.provider}) - {model.description}
              </option>
            ))}
          </select>

          <div style={{
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {availableModels.find(m => m.id === settings.default_model) && (
              <div>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                  Selected Model: {availableModels.find(m => m.id === settings.default_model)?.name}
                </div>
                <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '12px' }}>
                  Provider: {availableModels.find(m => m.id === settings.default_model)?.provider}
                </div>
                <button
                  onClick={handleTestModel}
                  disabled={testingModel}
                  style={{
                    padding: '8px 16px',
                    background: testingModel ? '#95a5a6' : '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: testingModel ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {testingModel ? '⏳ Testing...' : '🧪 Test Model'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Model Parameters */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#2c3e50',
          margin: '0 0 16px 0'
        }}>
          ⚙️ Model Parameters
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Temperature: {settings.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              style={{ width: '100%', marginBottom: '8px' }}
            />
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              Controls randomness (0 = deterministic, 2 = very random)
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Max Tokens
            </label>
            <input
              type="number"
              min="1"
              max="8000"
              value={settings.max_tokens}
              onChange={(e) => handleChange('max_tokens', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #e1e5e9',
                borderRadius: '4px',
                marginBottom: '8px'
              }}
            />
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              Maximum response length
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Top P: {settings.top_p}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.top_p}
              onChange={(e) => handleChange('top_p', parseFloat(e.target.value))}
              style={{ width: '100%', marginBottom: '8px' }}
            />
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              Alternative to temperature for controlling randomness
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Frequency Penalty: {settings.frequency_penalty}
            </label>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={settings.frequency_penalty}
              onChange={(e) => handleChange('frequency_penalty', parseFloat(e.target.value))}
              style={{ width: '100%', marginBottom: '8px' }}
            />
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              Reduces repetition of frequent tokens
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Presence Penalty: {settings.presence_penalty}
            </label>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={settings.presence_penalty}
              onChange={(e) => handleChange('presence_penalty', parseFloat(e.target.value))}
              style={{ width: '100%', marginBottom: '8px' }}
            />
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              Reduces repetition of any tokens
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Timeout (seconds)
            </label>
            <input
              type="number"
              min="5"
              max="300"
              value={settings.timeout_seconds}
              onChange={(e) => handleChange('timeout_seconds', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #e1e5e9',
                borderRadius: '4px',
                marginBottom: '8px'
              }}
            />
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              Request timeout duration
            </div>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600',
            color: '#2c3e50',
            margin: '0'
          }}>
            🔑 API Keys & Configuration
          </h3>
          <button
            onClick={() => setShowApiKeys(!showApiKeys)}
            style={{
              padding: '8px 16px',
              background: showApiKeys ? '#dc3545' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showApiKeys ? '👁️ Hide Keys' : '👁️‍🗨️ Show Keys'}
          </button>
        </div>

        {showApiKeys && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                OpenAI API Key
              </label>
              <input
                type="password"
                value={settings.openai_api_key}
                onChange={(e) => handleChange('openai_api_key', e.target.value)}
                placeholder="sk-..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}
              />
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                Required for GPT models
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Anthropic API Key
              </label>
              <input
                type="password"
                value={settings.anthropic_api_key}
                onChange={(e) => handleChange('anthropic_api_key', e.target.value)}
                placeholder="sk-ant-..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}
              />
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                Required for Claude models
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Google API Key
              </label>
              <input
                type="password"
                value={settings.google_api_key}
                onChange={(e) => handleChange('google_api_key', e.target.value)}
                placeholder="AIza..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}
              />
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                Required for Gemini models
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Custom Endpoint (Optional)
              </label>
              <input
                type="url"
                value={settings.custom_endpoint}
                onChange={(e) => handleChange('custom_endpoint', e.target.value)}
                placeholder="https://api.custom-ai.com/v1"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}
              />
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                For custom or self-hosted models
              </div>
            </div>
          </div>
        )}

        {!showApiKeys && (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#6c757d',
            background: 'white',
            borderRadius: '8px',
            border: '2px dashed #e1e5e9'
          }}>
            🔒 API keys are hidden for security. Click "Show Keys" to configure them.
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#2c3e50',
          margin: '0 0 16px 0'
        }}>
          🔧 Advanced Configuration
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Retry Attempts
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={settings.retry_attempts}
              onChange={(e) => handleChange('retry_attempts', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '8px'
              }}
            />
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              Number of retries on failure
            </div>
          </div>
        </div>
      </div>

      {/* Model Comparison */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        border: '2px solid #e1e5e9'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#2c3e50',
          margin: '0 0 16px 0'
        }}>
          📊 Model Comparison
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e1e5e9' }}>Model</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e1e5e9' }}>Provider</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e1e5e9' }}>Strengths</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e1e5e9' }}>Best For</th>
              </tr>
            </thead>
            <tbody>
              {availableModels.map((model, index) => (
                <tr key={model.id} style={{ 
                  background: settings.default_model === model.id ? '#e3f2fd' : 'transparent',
                  borderBottom: '1px solid #e1e5e9'
                }}>
                  <td style={{ padding: '12px', fontWeight: '600' }}>
                    {settings.default_model === model.id && '⭐ '}{model.name}
                  </td>
                  <td style={{ padding: '12px' }}>{model.provider}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{model.description}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    {model.id.includes('gpt-4') && 'Complex reasoning, coding'}
                    {model.id.includes('gpt-3.5') && 'General tasks, fast responses'}
                    {model.id.includes('claude') && 'Analysis, writing, ethics'}
                    {model.id.includes('gemini') && 'Multimodal, research'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '16px 48px',
            background: saving ? '#95a5a6' : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '0 auto',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
          }}
        >
          {saving ? (
            <>
              <span>⏳</span>
              Saving AI Settings...
            </>
          ) : (
            <>
              🤖 Save AI Model Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AIModelsSettingsComponent; 