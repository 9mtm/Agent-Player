/**
 * Enhanced Message Component
 * Displays a message with AI analysis, reactions, and feedback features
 */

import React, { useState } from 'react';
import {
  User,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Copy,
  MoreVertical,
  AlertCircle,
  Brain,
  Clock,
  Zap
} from 'lucide-react';
import { EnhancedMessage, MessageFeedbackRequest } from '../types';

interface EnhancedMessageProps {
  message: EnhancedMessage;
  onReact?: (messageId: string, reaction: string) => void;
  onFeedback?: (messageId: string, feedback: MessageFeedbackRequest) => void;
  onReply?: (messageId: string) => void;
  showActions?: boolean;
}

export const EnhancedMessageComponent: React.FC<EnhancedMessageProps> = ({
  message,
  onReact,
  onFeedback,
  onReply,
  showActions = true,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const isUser = message.sender_type === 'user';
  const isAgent = message.sender_type === 'agent';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  const handleFeedback = (feedback: 'positive' | 'negative', reason?: string) => {
    if (onFeedback) {
      const feedbackData: MessageFeedbackRequest = {
        feedback,
        reason,
        quality_score: feedback === 'positive' ? 5 : 2
      };
      onFeedback(message.id, feedbackData);
      setFeedbackOpen(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getSentimentColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score > 0.6) return 'text-green-600';
    if (score < 0.4) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-200';
    if (confidence > 0.8) return 'bg-green-500';
    if (confidence > 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message Header */}
        <div className={`flex items-center space-x-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {!isUser && (
            <div className="flex items-center space-x-1">
              {isAgent ? (
                <Bot className="w-4 h-4 text-blue-500" />
              ) : (
                <User className="w-4 h-4 text-gray-500" />
              )}
              <span className="text-xs text-gray-600 font-medium">
                {message.sender_name || (isAgent ? `Agent ${message.agent_id}` : 'System')}
              </span>
            </div>
          )}
          
          <span className="text-xs text-gray-500">
            {formatTimestamp(message.created_at)}
          </span>
          
          {/* AI Model Badge */}
          {message.ai_model_used && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {message.ai_model_used}
            </span>
          )}
        </div>

        {/* Message Bubble */}
        <div
          className={`relative px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }`}
        >
          {/* Message Content */}
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* AI Confidence Indicator */}
          {message.ai_confidence && (
            <div className="mt-2 flex items-center space-x-2">
              <Brain className="w-3 h-3 text-gray-400" />
              <div className="flex-1 bg-gray-200 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all duration-300 ${getConfidenceColor(message.ai_confidence)}`}
                  style={{ width: `${message.ai_confidence * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">
                {(message.ai_confidence * 100).toFixed(0)}%
              </span>
            </div>
          )}

          {/* Performance Metrics */}
          {(message.response_time_ms || message.total_tokens) && (
            <div className="mt-2 flex items-center space-x-3 text-xs text-gray-500">
              {message.response_time_ms && (
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{message.response_time_ms}ms</span>
                </span>
              )}
              {message.total_tokens && (
                <span className="flex items-center space-x-1">
                  <Zap className="w-3 h-3" />
                  <span>{message.total_tokens} tokens</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Sentiment & Intent Analysis */}
        {(message.sentiment_score || message.intent_classification) && (
          <div className="mt-1 flex items-center space-x-3 text-xs">
            {message.sentiment_score && (
              <span className={`flex items-center space-x-1 ${getSentimentColor(message.sentiment_score)}`}>
                <span>😊</span>
                <span>{(message.sentiment_score * 100).toFixed(0)}%</span>
              </span>
            )}
            {message.intent_classification && (
              <span className="text-gray-500">
                Intent: {message.intent_classification.intent}
              </span>
            )}
          </div>
        )}

        {/* Follow-up Suggestions */}
        {message.follow_up_suggestions && message.follow_up_suggestions.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.follow_up_suggestions.slice(0, 2).map((suggestion, index) => (
              <button
                key={index}
                className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                onClick={() => {
                  console.log('Suggestion clicked:', suggestion);
                }}
              >
                💡 {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Actions Bar */}
        {showActions && (
          <div className={`mt-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'justify-end' : 'justify-start'}`}>
            {/* Reactions */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onReact?.(message.id, 'thumbs_up')}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="Helpful"
              >
                <ThumbsUp className="w-3 h-3 text-gray-500" />
              </button>
              
              <button
                onClick={() => onReact?.(message.id, 'thumbs_down')}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="Not helpful"
              >
                <ThumbsDown className="w-3 h-3 text-gray-500" />
              </button>
              
              <button
                onClick={() => onReact?.(message.id, 'heart')}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="Love it"
              >
                <Heart className="w-3 h-3 text-gray-500" />
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleCopy}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              title="Copy message"
            >
              <Copy className="w-3 h-3 text-gray-500" />
            </button>

            {isAgent && onFeedback && (
              <button
                onClick={() => setFeedbackOpen(!feedbackOpen)}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="Provide feedback"
              >
                <AlertCircle className="w-3 h-3 text-gray-500" />
              </button>
            )}

            {onReply && (
              <button
                onClick={() => onReply(message.id)}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="Reply"
              >
                <MoreVertical className="w-3 h-3 text-gray-500" />
              </button>
            )}

            {/* AI Details Toggle */}
            {(message.reasoning_chain || message.keywords || message.entities_extracted) && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="Show AI details"
              >
                <Brain className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>
        )}

        {/* Feedback Panel */}
        {feedbackOpen && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
            <p className="text-sm font-medium mb-2">How was this response?</p>
            <div className="flex space-x-2">
              <button
                onClick={() => handleFeedback('positive', 'Helpful and accurate')}
                className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
              >
                <ThumbsUp className="w-3 h-3" />
                <span className="text-xs">Good</span>
              </button>
              <button
                onClick={() => handleFeedback('negative', 'Not helpful or inaccurate')}
                className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
              >
                <ThumbsDown className="w-3 h-3" />
                <span className="text-xs">Poor</span>
              </button>
            </div>
          </div>
        )}

        {/* AI Details Panel */}
        {showDetails && (
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border">
            <h4 className="text-sm font-medium mb-2 flex items-center space-x-1">
              <Brain className="w-4 h-4 text-blue-600" />
              <span>AI Analysis Details</span>
            </h4>
            
            {/* Reasoning Chain */}
            {message.reasoning_chain && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Reasoning Process:</p>
                <div className="space-y-1">
                  {message.reasoning_chain.map((step, index) => (
                    <div key={index} className="text-xs text-gray-600">
                      <span className="font-medium">{step.step}:</span> {step.description}
                      <span className="ml-2 text-blue-600">({(step.confidence * 100).toFixed(0)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {message.keywords && message.keywords.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Keywords:</p>
                <div className="flex flex-wrap gap-1">
                  {message.keywords.map((keyword, index) => (
                    <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Entities */}
            {message.entities_extracted && message.entities_extracted.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">Entities:</p>
                <div className="flex flex-wrap gap-1">
                  {message.entities_extracted.map((entity, index) => (
                    <span key={index} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      {entity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Existing Reactions */}
        {message.user_reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(
              message.user_reactions.reduce((acc, reaction) => {
                acc[reaction.type] = (acc[reaction.type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <span
                key={type}
                className="inline-flex items-center space-x-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
              >
                <span>
                  {type === 'thumbs_up' && '👍'}
                  {type === 'thumbs_down' && '👎'}
                  {type === 'heart' && '❤️'}
                </span>
                <span>{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 