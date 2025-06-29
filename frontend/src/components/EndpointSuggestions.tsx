import React, { useState, useEffect } from 'react';
import { 
  getSuggestedEndpoints, 
  getEndpointConfig, 
  getRecommendedServers,
  formatEndpointUrl,
  validateEndpoint,
  ModelEndpointConfig,
  LOCAL_AI_SERVERS
} from '../utils/localModelEndpoints';

interface EndpointSuggestionsProps {
  selectedModel: string;
  currentHost: string;
  currentPort: string;
  currentEndpoint: string;
  onEndpointSelect: (host: string, port: string, endpoint: string) => void;
  onConfigChange?: (config: ModelEndpointConfig) => void;
}

interface EndpointOption {
  config: ModelEndpointConfig;
  isRecommended: boolean;
  compatibilityScore: number;
}

export const EndpointSuggestions: React.FC<EndpointSuggestionsProps> = ({
  selectedModel,
  currentHost,
  currentPort,
  currentEndpoint,
  onEndpointSelect,
  onConfigChange
}) => {
  const [suggestions, setSuggestions] = useState<EndpointOption[]>([]);
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  useEffect(() => {
    generateSuggestions();
  }, [selectedModel]);

  const generateSuggestions = () => {
    if (!selectedModel) {
      setSuggestions([]);
      return;
    }

    const suggestedEndpoints = getSuggestedEndpoints(selectedModel);
    const recommendedServers = getRecommendedServers().map(s => s.server.toLowerCase().replace(/\s+/g, ''));
    
    const endpointOptions: EndpointOption[] = [];

    // Add suggested endpoints
    suggestedEndpoints.forEach(serverKey => {
      const config = getEndpointConfig(serverKey);
      if (config) {
        endpointOptions.push({
          config,
          isRecommended: recommendedServers.includes(serverKey),
          compatibilityScore: calculateCompatibilityScore(config, selectedModel)
        });
      }
    });

    // Add other popular servers if not already included
    Object.keys(LOCAL_AI_SERVERS).forEach(serverKey => {
      if (!suggestedEndpoints.includes(serverKey)) {
        const config = getEndpointConfig(serverKey);
        if (config && config.difficulty === 'easy') {
          endpointOptions.push({
            config,
            isRecommended: false,
            compatibilityScore: calculateCompatibilityScore(config, selectedModel)
          });
        }
      }
    });

    // Sort by compatibility score and recommendation
    const sortedSuggestions = endpointOptions.sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return b.compatibilityScore - a.compatibilityScore;
    });

    setSuggestions(sortedSuggestions);
  };

  const calculateCompatibilityScore = (config: ModelEndpointConfig, model: string): number => {
    let score = 0;
    const modelLower = model.toLowerCase();
    
    // Check if model is directly supported
    if (config.modelsSupported.some(m => modelLower.includes(m) || m.includes(modelLower))) {
      score += 50;
    }
    
    // Bonus for easier setup
    if (config.difficulty === 'easy') score += 30;
    else if (config.difficulty === 'medium') score += 20;
    else score += 10;
    
    // Bonus for OpenAI compatibility
    if (config.defaultEndpoint.includes('/v1/')) score += 20;
    
    // Bonus for streaming support
    if (config.supportsStreaming) score += 10;
    
    return score;
  };

  const handleSuggestionSelect = (config: ModelEndpointConfig) => {
    setSelectedSuggestion(config.server);
    onEndpointSelect(config.defaultHost, config.defaultPort, config.defaultEndpoint);
    if (onConfigChange) {
      onConfigChange(config);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#28a745';
      case 'medium': return '#ffc107';
      case 'hard': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '🟢';
      case 'medium': return '🟡';
      case 'hard': return '🔴';
      default: return '⚪';
    }
  };

  const currentUrl = formatEndpointUrl(currentHost, currentPort, currentEndpoint);
  const validation = validateEndpoint(currentHost, currentPort, currentEndpoint);

  if (!selectedModel || selectedModel === 'gpt-4' || selectedModel === 'gpt-3.5-turbo') {
    return null; // Don't show suggestions for online models
  }

  const displaySuggestions = showAllOptions ? suggestions : suggestions.slice(0, 3);

  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#495057'
        }}>
          💡 Suggested Endpoints for {selectedModel}
        </div>
        {suggestions.length > 3 && (
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              fontSize: '12px',
              textDecoration: 'underline'
            }}
            onClick={() => setShowAllOptions(!showAllOptions)}
          >
            {showAllOptions ? 'Show Less' : `Show All (${suggestions.length})`}
          </button>
        )}
      </div>

      {displaySuggestions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displaySuggestions.map((option, index) => {
            const isSelected = selectedSuggestion === option.config.server;
            const isCurrentlyUsed = 
              currentHost === option.config.defaultHost &&
              currentPort === option.config.defaultPort &&
              currentEndpoint === option.config.defaultEndpoint;

            return (
              <div
                key={option.config.server}
                style={{
                  padding: '12px',
                  backgroundColor: isSelected || isCurrentlyUsed ? '#e3f2fd' : 'white',
                  border: `1px solid ${isSelected || isCurrentlyUsed ? '#2196f3' : '#dee2e6'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onClick={() => handleSuggestionSelect(option.config)}
                onMouseEnter={(e) => {
                  if (!isSelected && !isCurrentlyUsed) {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                    e.currentTarget.style.borderColor = '#adb5bd';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected && !isCurrentlyUsed) {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#dee2e6';
                  }
                }}
              >
                {/* Recommendation badge */}
                {(option.isRecommended || index === 0) && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '8px',
                    backgroundColor: option.isRecommended ? '#28a745' : '#667eea',
                    color: 'white',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontWeight: '600'
                  }}>
                    {option.isRecommended ? '⭐ RECOMMENDED' : '🥇 BEST MATCH'}
                  </div>
                )}

                {isCurrentlyUsed && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '8px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontWeight: '600'
                  }}>
                    ✅ CURRENT
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#495057',
                      marginBottom: '4px'
                    }}>
                      {option.config.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6c757d',
                      lineHeight: '1.4'
                    }}>
                      {option.config.description}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: getDifficultyColor(option.config.difficulty),
                    fontWeight: '600'
                  }}>
                    {getDifficultyIcon(option.config.difficulty)}
                    {option.config.difficulty.toUpperCase()}
                  </div>
                </div>

                <div style={{
                  fontSize: '11px',
                  color: '#495057',
                  backgroundColor: '#e9ecef',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  marginBottom: '8px'
                }}>
                  📍 {formatEndpointUrl(option.config.defaultHost, option.config.defaultPort, option.config.defaultEndpoint)}
                </div>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  marginBottom: '8px'
                }}>
                  {option.config.features.slice(0, 3).map((feature, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '10px',
                        backgroundColor: '#667eea',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '10px'
                      }}
                    >
                      {feature}
                    </span>
                  ))}
                  {option.config.features.length > 3 && (
                    <span style={{
                      fontSize: '10px',
                      color: '#6c757d'
                    }}>
                      +{option.config.features.length - 3} more
                    </span>
                  )}
                </div>

                {option.config.setup && (
                  <div style={{
                    fontSize: '11px',
                    color: '#856404',
                    backgroundColor: '#fff3cd',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid #ffeaa7'
                  }}>
                    <strong>Setup:</strong> {option.config.setup}
                  </div>
                )}

                {(isSelected || isCurrentlyUsed) && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    color: '#155724',
                    fontWeight: '600'
                  }}>
                    {isCurrentlyUsed ? '✅ This configuration is currently active' : '👆 Click to apply this configuration'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#6c757d',
          fontSize: '13px'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤔</div>
          <div>No specific suggestions for this model.</div>
          <div style={{ marginTop: '4px', fontSize: '11px' }}>
            Try Ollama (port 11434) or LocalAI (port 8080) for most local models.
          </div>
        </div>
      )}

      {/* Current configuration status */}
      <div style={{
        marginTop: '12px',
        padding: '8px',
        backgroundColor: validation.isValid ? '#d4edda' : '#f8d7da',
        borderRadius: '4px',
        border: `1px solid ${validation.isValid ? '#c3e6cb' : '#f5c6cb'}`
      }}>
        <div style={{
          fontSize: '11px',
          color: validation.isValid ? '#155724' : '#721c24',
          fontWeight: '600',
          marginBottom: '4px'
        }}>
          {validation.isValid ? '✅ Current Configuration' : '❌ Configuration Issues'}
        </div>
        <div style={{
          fontSize: '10px',
          color: validation.isValid ? '#155724' : '#721c24',
          fontFamily: 'monospace'
        }}>
          {validation.isValid ? currentUrl : validation.errors.join(', ')}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{
        marginTop: '12px',
        display: 'flex',
        gap: '8px',
        justifyContent: 'center'
      }}>
        <button
          type="button"
          style={{
            padding: '4px 8px',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
          onClick={() => handleSuggestionSelect(LOCAL_AI_SERVERS.ollama)}
        >
          🦙 Quick: Ollama Default
        </button>
        <button
          type="button"
          style={{
            padding: '4px 8px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
          onClick={() => handleSuggestionSelect(LOCAL_AI_SERVERS.localai)}
        >
          🏠 Quick: LocalAI Default
        </button>
        <button
          type="button"
          style={{
            padding: '4px 8px',
            backgroundColor: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
          onClick={() => handleSuggestionSelect(LOCAL_AI_SERVERS.lmstudio)}
        >
          🖥️ Quick: LM Studio
        </button>
      </div>
    </div>
  );
};

export default EndpointSuggestions; 