import React from 'react';
import type { SettingsJson } from '../types';

interface LLMTabProps {
  settingsJson: SettingsJson;
  setSettingsJson: React.Dispatch<React.SetStateAction<SettingsJson>>;
}

const LLMTab: React.FC<LLMTabProps> = ({
  settingsJson,
  setSettingsJson,
}) => {
  return (
    <div style={{ padding: '24px 0', maxWidth: 520 }}>
      <h3>🤖 AI Models & LLM Settings</h3>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Configure AI model providers and manage your API keys. Your knowledge base persists across all models.
      </p>

      {/* LLM Provider Selection */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontWeight: 600, display: 'block', marginBottom: 12 }}>
          Default LLM Provider:
        </label>
        <select 
          value={settingsJson.defaultLLM} 
          onChange={e => setSettingsJson(s => ({ ...s, defaultLLM: e.target.value }))} 
          style={{ 
            width: '100%', 
            padding: 12, 
            borderRadius: 6, 
            border: '1px solid #ccc', 
            fontSize: 14 
          }}
        >
          <option value="openai">🤖 OpenAI (GPT-4, GPT-3.5)</option>
          <option value="anthropic">🧠 Anthropic (Claude)</option>
          <option value="google">🔍 Google (Gemini)</option>
          <option value="local">💻 Local Models</option>
        </select>
      </div>

      {/* API Keys */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 16px 0' }}>API Keys</h4>
        
        {/* OpenAI */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '12px' 
        }}>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: 8 }}>
            OpenAI API Key:
          </label>
          <input 
            type="password" 
            placeholder="sk-..."
            style={{ 
              width: '100%', 
              padding: 8, 
              borderRadius: 6, 
              border: '1px solid #ccc', 
              marginBottom: 8 
            }} 
          />
          <small style={{ color: '#666' }}>
            Get your key from{' '}
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              OpenAI Platform
            </a>
          </small>
        </div>

        {/* Anthropic */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '12px' 
        }}>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: 8 }}>
            Anthropic API Key:
          </label>
          <input 
            type="password" 
            placeholder="sk-ant-..."
            style={{ 
              width: '100%', 
              padding: 8, 
              borderRadius: 6, 
              border: '1px solid #ccc', 
              marginBottom: 8 
            }} 
          />
          <small style={{ color: '#666' }}>
            Get your key from{' '}
            <a 
              href="https://console.anthropic.com/" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Anthropic Console
            </a>
          </small>
        </div>

        {/* Google */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '16px', 
          borderRadius: '8px' 
        }}>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: 8 }}>
            Google API Key:
          </label>
          <input 
            type="password" 
            placeholder="AIza..."
            style={{ 
              width: '100%', 
              padding: 8, 
              borderRadius: 6, 
              border: '1px solid #ccc', 
              marginBottom: 8 
            }} 
          />
          <small style={{ color: '#666' }}>
            Get your key from{' '}
            <a 
              href="https://console.cloud.google.com/" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Google Cloud Console
            </a>
          </small>
        </div>
      </div>

      {/* Model Configuration */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 16px 0' }}>Model Configuration</h4>
        
        <label style={{ display: 'block', marginBottom: 8 }}>
          Temperature: 0.7
          <input 
            type="range" 
            min="0" 
            max="2" 
            step="0.1" 
            defaultValue="0.7"
            style={{ width: '100%', marginTop: 4 }} 
          />
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: 12, 
            color: '#666' 
          }}>
            <span>More Focused</span>
            <span>More Creative</span>
          </div>
        </label>

        <label style={{ display: 'block', marginBottom: 8, marginTop: 16 }}>
          Max Tokens:
          <input 
            type="number" 
            defaultValue="2048" 
            min="1" 
            max="8192"
            style={{ 
              width: '100%', 
              padding: 8, 
              borderRadius: 6, 
              border: '1px solid #ccc', 
              marginTop: 4 
            }} 
          />
        </label>
      </div>

      {/* Advanced Options */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 16px 0' }}>Advanced Options</h4>
        
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginRight: 8 }} />
            Enable streaming responses
          </label>
          <small style={{ color: '#666', marginLeft: 24 }}>
            Show responses as they are generated
          </small>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked style={{ marginRight: 8 }} />
            Auto-save conversations to knowledge base
          </label>
          <small style={{ color: '#666', marginLeft: 24 }}>
            Automatically preserve conversation context
          </small>
        </div>
      </div>

      {/* Knowledge Persistence Info */}
      <div style={{
        background: '#e3f2fd',
        border: '1px solid #bbdefb',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '24px'
      }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>
          💡 Knowledge Persistence
        </h4>
        <p style={{ margin: 0, fontSize: '14px', color: '#1565c0' }}>
          Your personal knowledge base and conversation history are stored independently of your chosen AI provider. 
          This means you can switch between different models (OpenAI, Anthropic, Google, etc.) while keeping all your data and context intact.
        </p>
      </div>
    </div>
  );
};

export default LLMTab; 