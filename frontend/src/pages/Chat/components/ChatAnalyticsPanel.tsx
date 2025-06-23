/**
 * Chat Analytics Panel Component
 * Displays comprehensive analytics, AI insights, and performance metrics
 */

import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Brain,
  Users,
  MessageCircle,
  Clock,
  Star,
  Activity,
  Eye,
  ChevronDown,
  ChevronUp,
  Lightbulb
} from 'lucide-react';
import { DashboardAnalytics, ChatAnalytics, AILearningSession } from '../types';

interface ChatAnalyticsPanelProps {
  dashboardAnalytics: DashboardAnalytics | null;
  conversationAnalytics: ChatAnalytics | null;
  learningSession: AILearningSession | null;
  isLoading: boolean;
  onTriggerLearning?: (conversationId: string) => void;
  onLoadInsights?: () => void;
}

export const ChatAnalyticsPanel: React.FC<ChatAnalyticsPanelProps> = ({
  dashboardAnalytics,
  conversationAnalytics,
  learningSession,
  isLoading,
  onTriggerLearning,
  onLoadInsights,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'learning'>('overview');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Overview Metrics Cards
  const overviewMetrics = [
    {
      title: 'Total Conversations',
      value: dashboardAnalytics?.total_conversations || 0,
      icon: MessageCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Users',
      value: dashboardAnalytics?.active_users || 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'AI Performance',
      value: `${((dashboardAnalytics?.ai_performance?.user_satisfaction || 0) * 20).toFixed(1)}%`,
      icon: Brain,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Response Time',
      value: `${(dashboardAnalytics?.ai_performance?.average_response_time || 0).toFixed(1)}s`,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'performance', label: 'Performance', icon: TrendingUp },
            { key: 'learning', label: 'AI Learning', icon: Brain }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewMetrics.map((metric, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${metric.bgColor}`}>
                    <metric.icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Popular Topics */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Popular Topics</h3>
              <Eye className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {dashboardAnalytics?.popular_topics?.slice(0, 5).map((topic, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{topic.topic}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, (topic.count / (dashboardAnalytics?.popular_topics?.[0]?.count || 1)) * 100)}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{topic.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <p className="text-gray-600">Performance analytics coming soon...</p>
          </div>
        </div>
      )}

      {/* Learning Tab */}
      {activeTab === 'learning' && (
        <div className="space-y-6">
          {/* Learning Session */}
          {learningSession && (
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Latest Learning Session</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  learningSession.status === 'completed' ? 'bg-green-100 text-green-700' :
                  learningSession.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {learningSession.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Confidence Score</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${learningSession.confidence_score * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {(learningSession.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Impact Score</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${learningSession.impact_score * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {(learningSession.impact_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Patterns Identified */}
              <div className="space-y-3">
                <button
                  onClick={() => toggleSection('patterns')}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h4 className="text-sm font-medium text-gray-700">Patterns Identified</h4>
                  {expandedSections.patterns ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                {expandedSections.patterns && (
                  <div className="space-y-2">
                    {learningSession.patterns_identified.map((pattern, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600">{pattern}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Skills Improved */}
              {learningSession.skills_improved.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Skills Improved</h4>
                  <div className="flex flex-wrap gap-2">
                    {learningSession.skills_improved.map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Learning Actions */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => onTriggerLearning?.('current')}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Brain className="w-4 h-4" />
                <span>Analyze Current Conversation</span>
              </button>
              
              <button
                onClick={onLoadInsights}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Activity className="w-4 h-4" />
                <span>Load AI Insights</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 