/**
 * Agent Loading Status Component
 * Shows the current status of agent loading and helps user troubleshoot
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, LogIn, Bot } from 'lucide-react';

interface AgentLoadingStatusProps {
  agents: any[];
  isLoading: boolean;
  error: string | null;
}

export const AgentLoadingStatus: React.FC<AgentLoadingStatusProps> = ({
  agents,
  isLoading,
  error
}) => {
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'not_authenticated'>('checking');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    checkAuthStatus();
    checkBackendStatus();
  }, []);

  const checkAuthStatus = () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        // Check if token is not expired
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now() / 1000;
        if (payload.exp > now) {
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('not_authenticated');
        }
      } catch (e) {
        setAuthStatus('not_authenticated');
      }
    } else {
      setAuthStatus('not_authenticated');
    }
  };

  const checkBackendStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/auth/system/status');
      if (response.ok) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('disconnected');
      }
    } catch (e) {
      setBackendStatus('disconnected');
    }
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (agents.length > 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2">
          <CheckCircle className="text-green-600" size={20} />
          <div>
            <h3 className="font-semibold text-green-800">Agents Loaded Successfully!</h3>
            <p className="text-green-700 text-sm">
              Found {agents.length} agent{agents.length !== 1 ? 's' : ''}. You can now start chatting.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Status Card */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-amber-800 mb-2">Chat System Status</h3>
            
            {/* Status Items */}
            <div className="space-y-2 text-sm">
              {/* Backend Status */}
              <div className="flex items-center space-x-2">
                {backendStatus === 'checking' && <RefreshCw className="animate-spin text-gray-500" size={16} />}
                {backendStatus === 'connected' && <CheckCircle className="text-green-600" size={16} />}
                {backendStatus === 'disconnected' && <XCircle className="text-red-600" size={16} />}
                <span className={`${
                  backendStatus === 'connected' ? 'text-green-700' : 
                  backendStatus === 'disconnected' ? 'text-red-700' : 'text-gray-700'
                }`}>
                  Backend Server: {
                    backendStatus === 'checking' ? 'Checking...' :
                    backendStatus === 'connected' ? 'Connected ✅' : 'Disconnected ❌'
                  }
                </span>
              </div>

              {/* Authentication Status */}
              <div className="flex items-center space-x-2">
                {authStatus === 'checking' && <RefreshCw className="animate-spin text-gray-500" size={16} />}
                {authStatus === 'authenticated' && <CheckCircle className="text-green-600" size={16} />}
                {authStatus === 'not_authenticated' && <XCircle className="text-red-600" size={16} />}
                <span className={`${
                  authStatus === 'authenticated' ? 'text-green-700' : 
                  authStatus === 'not_authenticated' ? 'text-red-700' : 'text-gray-700'
                }`}>
                  Authentication: {
                    authStatus === 'checking' ? 'Checking...' :
                    authStatus === 'authenticated' ? 'Logged In ✅' : 'Not Logged In ❌'
                  }
                </span>
              </div>

              {/* Agents Status */}
              <div className="flex items-center space-x-2">
                {isLoading && <RefreshCw className="animate-spin text-gray-500" size={16} />}
                {!isLoading && agents.length > 0 && <CheckCircle className="text-green-600" size={16} />}
                {!isLoading && agents.length === 0 && <XCircle className="text-red-600" size={16} />}
                <span className={`${
                  agents.length > 0 ? 'text-green-700' : 
                  isLoading ? 'text-gray-700' : 'text-red-700'
                }`}>
                  Agents: {
                    isLoading ? 'Loading...' :
                    agents.length > 0 ? `${agents.length} Found ✅` : 'None Found ❌'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Login Solution */}
        {authStatus === 'not_authenticated' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <LogIn className="text-blue-600 mt-0.5" size={20} />
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">Solution 1: Login Required</h4>
                <p className="text-blue-700 text-sm mb-3">
                  You need to login to access your agents and start chatting.
                </p>
                <button
                  onClick={handleLogin}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Go to Login Page
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Agents Solution */}
        {authStatus === 'authenticated' && agents.length === 0 && !isLoading && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Bot className="text-purple-600 mt-0.5" size={20} />
              <div>
                <h4 className="font-semibold text-purple-800 mb-2">Solution 2: Create Agents</h4>
                <p className="text-purple-700 text-sm mb-3">
                  You don't have any agents yet. Create agents to start chatting.
                </p>
                <button
                  onClick={() => window.location.href = '/agent'}
                  className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 transition-colors"
                >
                  Create Agent
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Refresh Solution */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <RefreshCw className="text-gray-600 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Try Again</h4>
              <p className="text-gray-700 text-sm mb-3">
                Refresh the page to retry loading agents.
              </p>
              <button
                onClick={handleRefresh}
                className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Details */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <XCircle className="text-red-600 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-red-800 mb-2">Error Details</h4>
              <p className="text-red-700 text-sm font-mono bg-red-100 p-2 rounded">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Technical Info */}
      <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <summary className="font-semibold text-gray-800 cursor-pointer">Technical Information</summary>
        <div className="mt-3 space-y-2 text-sm text-gray-700">
          <div><strong>API Endpoints:</strong></div>
          <div className="font-mono text-xs bg-gray-100 p-2 rounded">
            • GET http://localhost:8000/agents/main<br/>
            • GET http://localhost:8000/agents/child<br/>
            • GET http://localhost:8000/agents
          </div>
          <div><strong>Token Location:</strong> Browser localStorage</div>
          <div><strong>Authentication:</strong> JWT Bearer Token</div>
        </div>
      </details>
    </div>
  );
}; 