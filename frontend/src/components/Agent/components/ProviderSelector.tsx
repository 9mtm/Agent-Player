import React, { useState } from 'react';
import type { AIProvider, ProviderConfig } from '../../../types';

interface ProviderSelectorProps {
  provider: AIProvider;
  config: ProviderConfig;
  onChange: (provider: AIProvider, config: ProviderConfig) => void;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  provider,
  config,
  onChange
}) => {
  const [showHelp, setShowHelp] = useState(false);

  const handleProviderChange = (newProvider: AIProvider) => {
    // Reset config when changing providers
    const newConfig: ProviderConfig = {
      ...config,
      [newProvider]: newProvider === 'gemini' 
        ? { authType: 'google' }
        : { apiKey: '', model: 'gpt-4' }
    };
    onChange(newProvider, newConfig);
  };

  const handleGeminiAuthTypeChange = (authType: 'google' | 'apiKey') => {
    const newConfig: ProviderConfig = {
      ...config,
      gemini: {
        ...config.gemini,
        authType,
        apiKey: authType === 'google' ? undefined : config.gemini?.apiKey
      }
    };
    onChange(provider, newConfig);
  };

  const handleGeminiApiKeyChange = (apiKey: string) => {
    const newConfig: ProviderConfig = {
      ...config,
      gemini: {
        ...config.gemini,
        apiKey
      }
    };
    onChange(provider, newConfig);
  };

  const handleGoogleLogin = async () => {
    // TODO: Implement Google login
    window.open('https://makersuite.google.com/app/apikey', '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          AI Provider
        </label>
        <button
          type="button"
          className="text-sm text-blue-600 hover:text-blue-800"
          onClick={() => setShowHelp(!showHelp)}
        >
          Need help?
        </button>
      </div>

      {showHelp && (
        <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
          <h4 className="font-semibold mb-2">About AI Providers:</h4>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>OpenAI:</strong> Requires an API key from your OpenAI account.
              <a 
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline ml-1"
              >
                Get OpenAI API Key
              </a>
            </li>
            <li>
              <strong>Google Gemini:</strong> Two options available:
              <ul className="ml-4 mt-1">
                <li>• Sign in with your Google account (Recommended)</li>
                <li>
                  • Use API key from Google AI Studio
                  <a 
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline ml-1"
                  >
                    Get Gemini API Key
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      )}

      <select
        value={provider}
        onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
      >
        <option value="openai">OpenAI</option>
        <option value="gemini">Google Gemini</option>
      </select>

      {provider === 'gemini' && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Authentication Method
            </label>
            <select
              value={config.gemini?.authType || 'google'}
              onChange={(e) => handleGeminiAuthTypeChange(e.target.value as 'google' | 'apiKey')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="google">Sign in with Google (Recommended)</option>
              <option value="apiKey">Use API Key</option>
            </select>
          </div>

          {config.gemini?.authType === 'google' ? (
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg 
                className="w-5 h-5 mr-2" 
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12.545,12.151L12.545,12.151c0,1.054,0.855,1.909,1.909,1.909h3.536c-0.607,1.972-2.405,3.404-4.545,3.404c-2.627,0-4.545-2.127-4.545-4.545s2.127-4.545,4.545-4.545c1.127,0,2.163,0.386,2.981,1.031l2.982-2.982C17.309,4.342,14.976,3,12.545,3C7.909,3,4.182,6.727,4.182,11.364s3.727,8.364,8.364,8.364c4.636,0,8.364-3.727,8.364-8.364V9.455h-8.364V12.151z"/>
              </svg>
              Sign in with Google
            </button>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Gemini API Key
              </label>
              <input
                type="password"
                value={config.gemini?.apiKey || ''}
                onChange={(e) => handleGeminiApiKeyChange(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <p className="mt-2 text-sm text-gray-500">
                Get your API key from{' '}
                <a 
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProviderSelector; 