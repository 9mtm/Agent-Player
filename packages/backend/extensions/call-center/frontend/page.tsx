'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Phone,
  PhoneCall,
  MessageSquare,
  TrendingUp,
  Users,
  BarChart3,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Plus,
  Eye,
  Megaphone,
  Loader2,
  Settings,
  Key,
  History
} from 'lucide-react';
import CallCenterSettings from './settings';
import ProviderCredentials from './provider-credentials';
import CallDetailsPage from './call-details';

const BACKEND_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:41522'
  : process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:41522';

interface CallPoint {
  id: string;
  name: string;
  phone_number: string;
  status: string;
  total_calls: number;
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  total_contacts: number;
  completed_calls: number;
  interested_count: number;
}

interface Stats {
  totalCallPoints: number;
  totalCalls: number;
  activeCampaigns: number;
  queueLength: number;
}

export default function CallCenterDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Check if we should show call details page
  const callId = searchParams.get('callId');
  if (callId) {
    return <CallDetailsPage callId={callId} />;
  }

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [callPoints, setCallPoints] = useState<CallPoint[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCallPoints: 0,
    totalCalls: 0,
    activeCampaigns: 0,
    queueLength: 0
  });
  const [loading, setLoading] = useState(true);

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const [callPointsRes, campaignsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/telephony/call-points`, { headers }),
        fetch(`${BACKEND_URL}/api/ext/call-center/campaigns`, { headers })
      ]);

      let loadedCallPoints: CallPoint[] = [];
      let loadedCampaigns: Campaign[] = [];

      if (callPointsRes.ok) {
        const data = await callPointsRes.json();
        loadedCallPoints = data.callPoints || [];
        setCallPoints(loadedCallPoints);
      }

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        loadedCampaigns = data.campaigns || [];
        setCampaigns(loadedCampaigns);
      }

      setStats({
        totalCallPoints: loadedCallPoints.length,
        totalCalls: loadedCallPoints.reduce((sum, cp) => sum + (cp.total_calls || 0), 0),
        activeCampaigns: loadedCampaigns.filter(c => c.status === 'running').length,
        queueLength: 0
      });
    } catch (error) {
      console.error('[CallCenter] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'call-points', label: 'Call Points', icon: PhoneCall },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'recordings', label: 'Call History', icon: History },
    { id: 'queue', label: 'Queue', icon: Clock },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'knowledge', label: 'Knowledge', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  function handleTabChange(tabId: string) {
    setActiveTab(tabId);
    router.push(`?tab=${tabId}`, { scroll: false });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading Call Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Call Center</h1>
                <p className="text-sm text-gray-600">Professional AI-powered telephony system</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Cards - Only show on Overview tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl border">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">Total</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.totalCallPoints}</h3>
              <p className="text-sm text-gray-600">Call Points</p>
            </div>

            <div className="bg-white p-6 rounded-xl border">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <PhoneCall className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-sm text-gray-500">All Time</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.totalCalls}</h3>
              <p className="text-sm text-gray-600">Total Calls</p>
            </div>

            <div className="bg-white p-6 rounded-xl border">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Megaphone className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-sm text-gray-500">Active</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.activeCampaigns}</h3>
              <p className="text-sm text-gray-600">Campaigns</p>
            </div>

            <div className="bg-white p-6 rounded-xl border">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-sm text-gray-500">Waiting</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.queueLength}</h3>
              <p className="text-sm text-gray-600">In Queue</p>
            </div>
          </div>
        )}

        {/* Sidebar + Content Layout */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border overflow-hidden sticky top-6">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900">Navigation</h3>
              </div>
              <nav className="p-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full px-4 py-3 flex items-center gap-3 rounded-lg transition mb-1 ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border p-6">
              {activeTab === 'overview' && <OverviewTab callPoints={callPoints} campaigns={campaigns} />}
              {activeTab === 'call-points' && <CallPointsTab callPoints={callPoints} onRefresh={loadData} />}
              {activeTab === 'campaigns' && <CampaignsTab campaigns={campaigns} onRefresh={loadData} />}
              {activeTab === 'recordings' && <RecordingsTab />}
              {activeTab === 'queue' && <QueueTab />}
              {activeTab === 'analytics' && <AnalyticsTab />}
              {activeTab === 'templates' && <TemplatesTab />}
              {activeTab === 'knowledge' && <KnowledgeTab />}
              {activeTab === 'settings' && <SettingsTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ callPoints, campaigns }: { callPoints: CallPoint[]; campaigns: Campaign[] }) {
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);

  useEffect(() => {
    loadRecentCalls();
  }, []);

  async function loadRecentCalls() {
    try {
      setLoadingCalls(true);
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${BACKEND_URL}/api/ext/call-center/recordings?limit=5`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRecentCalls(data.recordings || []);
      }
    } catch (error) {
      console.error('[Overview] Load recent calls error:', error);
    } finally {
      setLoadingCalls(false);
    }
  }

  function formatDuration(seconds: number) {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  function formatTime(dateStr: string) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-blue-600" />
          Recent Call Points
        </h3>
        <div className="space-y-3">
          {callPoints.slice(0, 5).map((cp) => (
            <div key={cp.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border">
                  <Phone className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{cp.name}</h4>
                  <p className="text-sm text-gray-600">{cp.phone_number}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{cp.total_calls || 0}</p>
                <p className="text-xs text-gray-600">calls</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-purple-600" />
          Active Campaigns
        </h3>
        {campaigns.filter(c => c.status === 'running').length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No active campaigns</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.filter(c => c.status === 'running').slice(0, 5).map((campaign) => (
              <div key={campaign.id} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                    Running
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{campaign.completed_calls}/{campaign.total_contacts} calls</span>
                  <span>•</span>
                  <span>{campaign.interested_count} interested</span>
                </div>
                <div className="mt-2 bg-white rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-600 h-full transition-all"
                    style={{ width: `${(campaign.completed_calls / campaign.total_contacts) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Calls */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-green-600" />
            Recent Calls
          </h3>
          <a
            href="?tab=recordings"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
          >
            View All
            <Eye className="w-4 h-4" />
          </a>
        </div>
        {loadingCalls ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600">Loading calls...</p>
          </div>
        ) : recentCalls.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <PhoneCall className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No recent calls</p>
            <p className="text-xs mt-1">Make a test call to see it here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentCalls.map((call) => (
              <a
                key={call.id}
                href={`?callId=${call.id}`}
                className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition border border-transparent hover:border-blue-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      call.direction === 'outbound'
                        ? 'bg-blue-100'
                        : 'bg-green-100'
                    }`}>
                      <PhoneCall className={`w-4 h-4 ${
                        call.direction === 'outbound'
                          ? 'text-blue-600'
                          : 'text-green-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          call.direction === 'outbound'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {call.direction === 'outbound' ? 'Outbound' : 'Inbound'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          call.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {call.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 font-medium truncate">
                        {call.direction === 'outbound' ? call.to_number : call.from_number}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-medium text-gray-900">{formatDuration(call.duration_seconds)}</p>
                    <p className="text-xs text-gray-600">{formatTime(call.started_at)}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CallPointsTab({ callPoints, onRefresh }: { callPoints: CallPoint[]; onRefresh: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">All Call Points</h3>
        <button onClick={onRefresh} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Refresh
        </button>
      </div>
      <div className="grid gap-4">
        {callPoints.map((cp) => (
          <div key={cp.id} className="p-4 border rounded-lg hover:bg-gray-50 transition">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{cp.name}</h4>
                <p className="text-sm text-gray-600">{cp.phone_number}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">{cp.total_calls || 0}</p>
                  <p className="text-xs text-gray-600">calls</p>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <Eye className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignsTab({ campaigns, onRefresh }: { campaigns: Campaign[]; onRefresh: () => void }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-700';
      case 'paused': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">All Campaigns</h3>
        <div className="flex items-center gap-3">
          <button onClick={onRefresh} className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition">
            Refresh
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No campaigns yet</p>
          <p className="text-sm mb-4">Create your first outbound campaign to start calling customers</p>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="p-6 border rounded-lg hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">{campaign.name}</h4>
                  <p className="text-sm text-gray-600">{campaign.type}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                  {campaign.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Progress</p>
                  <p className="text-xl font-bold text-gray-900">{campaign.completed_calls}/{campaign.total_contacts}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Interested</p>
                  <p className="text-xl font-bold text-green-600">{campaign.interested_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Success Rate</p>
                  <p className="text-xl font-bold text-blue-600">
                    {campaign.completed_calls > 0 ? ((campaign.interested_count / campaign.completed_calls) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>

              <div className="bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
                <div className="bg-blue-600 h-full transition-all" style={{ width: `${(campaign.completed_calls / campaign.total_contacts) * 100}%` }} />
              </div>

              <div className="flex items-center gap-2">
                {campaign.status === 'running' ? (
                  <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition flex items-center gap-2">
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                ) : campaign.status === 'paused' ? (
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Resume
                  </button>
                ) : (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                )}
                <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition">View Details</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QueueTab() {
  return (
    <div className="text-center py-12 text-gray-500">
      <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
      <p className="text-lg font-medium mb-2">Queue Monitor</p>
      <p className="text-sm">Real-time call queue monitoring</p>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="text-center py-12 text-gray-500">
      <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
      <p className="text-lg font-medium mb-2">Analytics Dashboard</p>
      <p className="text-sm">Detailed analytics and reports</p>
    </div>
  );
}

function TemplatesTab() {
  return (
    <div className="text-center py-12 text-gray-500">
      <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
      <p className="text-lg font-medium mb-2">Industry Templates</p>
      <p className="text-sm">Pre-configured templates for different business types</p>
    </div>
  );
}

function KnowledgeTab() {
  return (
    <div className="text-center py-12 text-gray-500">
      <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
      <p className="text-lg font-medium mb-2">Knowledge Base</p>
      <p className="text-sm">FAQ and scripts management</p>
    </div>
  );
}

function CredentialsTab() {
  const [selectedProvider, setSelectedProvider] = useState<'twilio' | 'vonage' | 'microsoft_teams'>('twilio');

  const providers = [
    { id: 'twilio', name: 'Twilio', description: 'Global cloud communications platform' },
    { id: 'vonage', name: 'Vonage', description: 'Cloud communications and APIs' },
    { id: 'microsoft_teams', name: 'Microsoft Teams Phone', description: 'Enterprise cloud calling' }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Provider Credentials</h2>
        <p className="text-gray-600">
          Configure your telephony provider credentials. These will be encrypted and stored securely.
        </p>
      </div>

      {/* Provider Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Select Provider</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => setSelectedProvider(provider.id as any)}
              className={`p-4 rounded-lg border-2 transition text-left ${
                selectedProvider === provider.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h3 className="font-semibold text-gray-900 mb-1">{provider.name}</h3>
              <p className="text-sm text-gray-600">{provider.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Provider Credentials Form */}
      <ProviderCredentials
        providerId={`provider-${selectedProvider}`}
        providerName={selectedProvider}
        displayName={providers.find(p => p.id === selectedProvider)?.name || ''}
      />
    </div>
  );
}

function SettingsTab() {
  const [activeSubTab, setActiveSubTab] = useState('credentials');

  const subTabs = [
    { id: 'credentials', label: 'Credentials', icon: Key },
    { id: 'numbers', label: 'Numbers', icon: Phone },
    { id: 'general', label: 'General', icon: Settings }
  ];

  return (
    <div>
      {/* Sub-tabs Header */}
      <div className="flex gap-2 mb-6 border-b">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-3 flex items-center gap-2 border-b-2 transition ${
                activeSubTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab Content */}
      <div>
        {activeSubTab === 'credentials' && <CredentialsTab />}
        {activeSubTab === 'numbers' && <CallCenterSettings />}
        {activeSubTab === 'general' && (
          <div className="text-center py-12 text-gray-500">
            <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">General Settings</p>
            <p className="text-sm">Configure call center preferences and options</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RecordingsTab() {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedRecording, setSelectedRecording] = useState<any>(null);

  useEffect(() => {
    loadRecordings();
  }, []);

  // Removed hash-based deep linking - now using dedicated page

  // Function to open recording with URL update
  function openRecording(recording: any) {
    // Navigate to dedicated call details page
    window.location.href = `/dashboard/ext/call-center?callId=${recording.id}`;
  }

  // Function to close recording
  function closeRecording() {
    window.history.pushState('', document.title, window.location.pathname + window.location.search);
    setSelectedRecording(null);
  }

  async function loadRecordings() {
    try {
      setLoading(true);
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${BACKEND_URL}/api/ext/call-center/recordings?limit=100`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRecordings(data.recordings || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('[Recordings] Load error:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(seconds: number) {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading recordings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Call History</h3>
          <p className="text-sm text-gray-600">Total: {total} calls</p>
        </div>
        <button
          onClick={loadRecordings}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Refresh
        </button>
      </div>

      {recordings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <PhoneCall className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No Calls Yet</p>
          <p className="text-sm">Make some test calls to see them here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recordings.map((rec) => (
            <div
              key={rec.id}
              onClick={() => openRecording(rec)}
              className="bg-white border rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      rec.direction === 'outbound'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {rec.direction === 'outbound' ? 'Outbound' : 'Inbound'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      rec.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : rec.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {rec.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">From:</span>
                      <span className="ml-2 font-medium text-gray-900">{rec.from_number}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">To:</span>
                      <span className="ml-2 font-medium text-gray-900">{rec.to_number}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <span className="ml-2 font-medium text-gray-900">{formatDuration(rec.duration_seconds)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Started:</span>
                      <span className="ml-2 font-medium text-gray-900">{formatDate(rec.started_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transcript */}
              {rec.transcript && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Transcript
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{rec.transcript}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
                {rec.recording_url && (
                  <a
                    href={rec.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Play Recording
                  </a>
                )}
                <button
                  onClick={() => openRecording(rec)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recording Details Modal */}
      {selectedRecording && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => closeRecording()}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Call Details</h3>
              <button
                onClick={() => closeRecording()}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <XCircle className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Main Call Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 font-medium">Call SID:</span>
                  <p className="text-gray-900 mt-1 font-mono text-xs break-all">{selectedRecording.call_sid}</p>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Direction:</span>
                  <p className="text-gray-900 mt-1 capitalize">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      selectedRecording.direction === 'outbound'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {selectedRecording.direction}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">From:</span>
                  <p className="text-gray-900 mt-1">{selectedRecording.from_number}</p>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">To:</span>
                  <p className="text-gray-900 mt-1">{selectedRecording.to_number}</p>
                </div>
                {selectedRecording.phone_friendly_name && (
                  <div>
                    <span className="text-gray-600 font-medium">Phone Name:</span>
                    <p className="text-gray-900 mt-1">{selectedRecording.phone_friendly_name}</p>
                  </div>
                )}
                {selectedRecording.caller_name && (
                  <div>
                    <span className="text-gray-600 font-medium">Caller Name:</span>
                    <p className="text-gray-900 mt-1">{selectedRecording.caller_name}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-600 font-medium">Status:</span>
                  <p className="text-gray-900 mt-1 capitalize">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      selectedRecording.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : selectedRecording.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedRecording.status}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Duration:</span>
                  <p className="text-gray-900 mt-1 font-semibold">{formatDuration(selectedRecording.duration_seconds)}</p>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Started:</span>
                  <p className="text-gray-900 mt-1">{formatDate(selectedRecording.started_at)}</p>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Ended:</span>
                  <p className="text-gray-900 mt-1">{formatDate(selectedRecording.ended_at)}</p>
                </div>
              </div>

              {/* Technical Details */}
              <div className="pt-4 border-t">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Technical Details</h4>
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-gray-600 font-medium">Call ID:</span>
                    <p className="text-gray-900 mt-1 font-mono break-all">{selectedRecording.id}</p>
                  </div>
                  {selectedRecording.phone_number_id && (
                    <div className="bg-gray-50 p-3 rounded">
                      <span className="text-gray-600 font-medium">Phone Number ID:</span>
                      <p className="text-gray-900 mt-1 font-mono break-all">{selectedRecording.phone_number_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedRecording.recording_url && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-gray-900 mb-3">Recording</h4>
                  <audio controls className="w-full">
                    <source src={selectedRecording.recording_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {selectedRecording.transcript && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-gray-900 mb-3">Transcript</h4>
                  <div className="p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedRecording.transcript}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
