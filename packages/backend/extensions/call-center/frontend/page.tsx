'use client';

import { useState, useEffect } from 'react';
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneCall,
  Settings, Plus, Trash2, Edit, Power, PlayCircle,
  Clock, User, Workflow, Download, Eye, Search,
  RefreshCw, AlertCircle, CheckCircle, XCircle
} from 'lucide-react';
import { CallPointWizard } from '@/components/telephony/CallPointWizard';
import { PurchaseNumberDialog } from '@/components/telephony/PurchaseNumberDialog';
import { MakeCallDialog } from '@/components/telephony/MakeCallDialog';
import { toast } from 'sonner';
import { config } from '@/lib/config';

interface PhoneNumber {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  country_code: string | null;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
  provider: string;
  status: string;
  monthly_cost: number | null;
  purchased_at: string | null;
}

interface CallPoint {
  id: string;
  name: string;
  description: string | null;
  phone_number_id: string | null;
  phone_number: string | null;
  agent_id: string | null;
  agent_name: string | null;
  workflow_id: string | null;
  workflow_name: string | null;
  voice_provider: string;
  voice_id: string;
  language_preference: string;
  greeting_message: string | null;
  ivr_menu: string | null;
  enabled: number;
  created_at: string;
}

interface ActiveCall {
  id: string;
  call_point_name: string;
  from_number: string;
  to_number: string;
  direction: string;
  status: string;
  started_at: string;
  duration_seconds: number | null;
}

interface CallSession {
  id: string;
  call_point_name: string | null;
  direction: string;
  from_number: string;
  to_number: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  transcript: string | null;
}

export default function CallCenterPage() {
  const [activeTab, setActiveTab] = useState<'call-points' | 'phone-numbers' | 'active-calls' | 'call-history' | 'settings'>('call-points');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Call Points state
  const [callPoints, setCallPoints] = useState<CallPoint[]>([]);
  const [showCallPointWizard, setShowCallPointWizard] = useState(false);

  // Phone Numbers state
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  // Active Calls state
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [showMakeCallDialog, setShowMakeCallDialog] = useState(false);

  // Call History state
  const [callSessions, setCallSessions] = useState<CallSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CallSession | null>(null);

  // Settings state
  const [credentials, setCredentials] = useState<any>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      switch (activeTab) {
        case 'call-points':
          await loadCallPoints();
          break;
        case 'phone-numbers':
          await loadPhoneNumbers();
          break;
        case 'active-calls':
          await loadActiveCalls();
          break;
        case 'call-history':
          await loadCallHistory();
          break;
        case 'settings':
          await loadSettings();
          break;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadCallPoints = async () => {
    const response = await fetch(`${config.backendUrl}/api/telephony/call-points`);
    if (!response.ok) throw new Error('Failed to load call points');
    const data = await response.json();
    setCallPoints(data.callPoints || []);
  };

  const loadPhoneNumbers = async () => {
    const response = await fetch(`${config.backendUrl}/api/telephony/numbers`);
    if (!response.ok) throw new Error('Failed to load phone numbers');
    const data = await response.json();
    setPhoneNumbers(data.numbers || []);
  };

  const loadActiveCalls = async () => {
    const response = await fetch(`${config.backendUrl}/api/telephony/calls/active`);
    if (!response.ok) throw new Error('Failed to load active calls');
    const data = await response.json();
    setActiveCalls(data.calls || []);
  };

  const loadCallHistory = async () => {
    const response = await fetch(`${config.backendUrl}/api/telephony/sessions`);
    if (!response.ok) throw new Error('Failed to load call history');
    const data = await response.json();
    setCallSessions(data.sessions || []);
  };

  const loadSettings = async () => {
    const response = await fetch(`${config.backendUrl}/api/telephony/settings/credentials`);
    if (!response.ok) throw new Error('Failed to load settings');
    const data = await response.json();
    setCredentials(data.credentials || {});
  };

  const toggleCallPoint = async (callPointId: string, currentEnabled: number) => {
    try {
      const response = await fetch(`${config.backendUrl}/api/telephony/call-points/${callPointId}/toggle`, {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Failed to toggle call point');

      await loadCallPoints();
      toast.success('Call point toggled successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle call point');
    }
  };

  const deleteCallPoint = async (callPointId: string) => {
    if (!confirm('Are you sure you want to delete this call point?')) return;

    try {
      const response = await fetch(`${config.backendUrl}/api/telephony/call-points/${callPointId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete call point');

      await loadCallPoints();
      toast.success('Call point deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete call point');
    }
  };

  const testConnection = async (provider: string) => {
    setTestingConnection(true);
    try {
      const response = await fetch(`${config.backendUrl}/api/telephony/settings/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${provider} connection successful!`);
      } else {
        toast.error(`${provider} connection failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      toast.error(`Connection test failed: ${err.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Phone className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Call Center
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage phone numbers, call points, and telephony settings
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('call-points')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'call-points'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4" />
              Call Points
            </div>
          </button>

          <button
            onClick={() => setActiveTab('phone-numbers')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'phone-numbers'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Numbers
            </div>
          </button>

          <button
            onClick={() => setActiveTab('active-calls')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'active-calls'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <PhoneOutgoing className="w-4 h-4" />
              Active Calls
            </div>
          </button>

          <button
            onClick={() => setActiveTab('call-history')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'call-history'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Call History
            </div>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </div>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          {activeTab === 'call-points' && (
            <CallPointsTab
              callPoints={callPoints}
              loading={loading}
              onToggle={toggleCallPoint}
              onDelete={deleteCallPoint}
              onRefresh={loadCallPoints}
              onCreateNew={() => setShowCallPointWizard(true)}
            />
          )}

          {activeTab === 'phone-numbers' && (
            <PhoneNumbersTab
              phoneNumbers={phoneNumbers}
              loading={loading}
              onRefresh={loadPhoneNumbers}
              onPurchase={() => setShowPurchaseDialog(true)}
            />
          )}

          {activeTab === 'active-calls' && (
            <ActiveCallsTab
              activeCalls={activeCalls}
              loading={loading}
              onRefresh={loadActiveCalls}
              onMakeCall={() => setShowMakeCallDialog(true)}
            />
          )}

          {activeTab === 'call-history' && (
            <CallHistoryTab
              callSessions={callSessions}
              loading={loading}
              selectedSession={selectedSession}
              onSelectSession={setSelectedSession}
              onRefresh={loadCallHistory}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              credentials={credentials}
              loading={loading}
              testingConnection={testingConnection}
              onTestConnection={testConnection}
              onRefresh={loadSettings}
            />
          )}
        </div>

        {/* Dialogs */}
        <CallPointWizard
          isOpen={showCallPointWizard}
          onClose={() => setShowCallPointWizard(false)}
          onSuccess={loadCallPoints}
        />

        <PurchaseNumberDialog
          isOpen={showPurchaseDialog}
          onClose={() => setShowPurchaseDialog(false)}
          onSuccess={loadPhoneNumbers}
        />

        <MakeCallDialog
          isOpen={showMakeCallDialog}
          onClose={() => setShowMakeCallDialog(false)}
          onSuccess={loadActiveCalls}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Call Points Tab
// ============================================================================

interface CallPointsTabProps {
  callPoints: CallPoint[];
  loading: boolean;
  onToggle: (id: string, currentEnabled: number) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onCreateNew: () => void;
}

function CallPointsTab({ callPoints, loading, onToggle, onDelete, onRefresh, onCreateNew }: CallPointsTabProps) {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Call Points</h2>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Call Point
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : callPoints.length === 0 ? (
        <div className="text-center py-12">
          <PhoneCall className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">No call points configured yet</p>
          <button
            onClick={onCreateNew}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Call Point
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Phone Number</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Agent</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Workflow</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Voice</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {callPoints.map((callPoint) => (
                <tr key={callPoint.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onToggle(callPoint.id, callPoint.enabled)}
                      className={`p-2 rounded-full transition-colors ${
                        callPoint.enabled
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={callPoint.enabled ? 'Enabled - Click to disable' : 'Disabled - Click to enable'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{callPoint.name}</div>
                      {callPoint.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">{callPoint.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-900 dark:text-white font-mono text-sm">
                      {callPoint.phone_number || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-700 dark:text-gray-300">
                      {callPoint.agent_name || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-700 dark:text-gray-300">
                      {callPoint.workflow_name || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {callPoint.voice_id} ({callPoint.voice_provider})
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(callPoint.id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Phone Numbers Tab
// ============================================================================

interface PhoneNumbersTabProps {
  phoneNumbers: PhoneNumber[];
  loading: boolean;
  onRefresh: () => void;
  onPurchase: () => void;
}

function PhoneNumbersTab({ phoneNumbers, loading, onRefresh, onPurchase }: PhoneNumbersTabProps) {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Phone Numbers</h2>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={onPurchase}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Purchase Number
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : phoneNumbers.length === 0 ? (
        <div className="text-center py-12">
          <Phone className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">No phone numbers purchased yet</p>
          <button
            onClick={onPurchase}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Purchase Your First Number
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Phone Number</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Friendly Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Country</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Capabilities</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Provider</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Monthly Cost</th>
              </tr>
            </thead>
            <tbody>
              {phoneNumbers.map((number) => (
                <tr key={number.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4">
                    <span className="font-mono text-gray-900 dark:text-white">{number.phone_number}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-700 dark:text-gray-300">{number.friendly_name || '-'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-700 dark:text-gray-300">{number.country_code || '-'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      {number.capabilities?.voice && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded">Voice</span>
                      )}
                      {number.capabilities?.sms && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded">SMS</span>
                      )}
                      {number.capabilities?.mms && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded">MMS</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{number.provider}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      number.status === 'active'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                    }`}>
                      {number.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-700 dark:text-gray-300">
                      {number.monthly_cost ? `$${number.monthly_cost.toFixed(2)}` : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Active Calls Tab
// ============================================================================

interface ActiveCallsTabProps {
  activeCalls: ActiveCall[];
  loading: boolean;
  onRefresh: () => void;
  onMakeCall: () => void;
}

function ActiveCallsTab({ activeCalls, loading, onRefresh, onMakeCall }: ActiveCallsTabProps) {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Active Calls</h2>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={onMakeCall}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <PhoneOutgoing className="w-4 h-4" />
            Make Call
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : activeCalls.length === 0 ? (
        <div className="text-center py-12">
          <PhoneCall className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No active calls</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeCalls.map((call) => (
            <div key={call.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {call.direction === 'inbound' ? (
                      <PhoneIncoming className="w-4 h-4 text-green-600" />
                    ) : (
                      <PhoneOutgoing className="w-4 h-4 text-blue-600" />
                    )}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {call.call_point_name || 'Unknown Call Point'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    From: <span className="font-mono">{call.from_number}</span> →
                    To: <span className="font-mono">{call.to_number}</span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Status: {call.status} • Duration: {call.duration_seconds || 0}s
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors">
                    Hangup
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Call History Tab
// ============================================================================

interface CallHistoryTabProps {
  callSessions: CallSession[];
  loading: boolean;
  selectedSession: CallSession | null;
  onSelectSession: (session: CallSession | null) => void;
  onRefresh: () => void;
}

function CallHistoryTab({ callSessions, loading, selectedSession, onSelectSession, onRefresh }: CallHistoryTabProps) {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Call History</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : callSessions.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No call history yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Date/Time</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Direction</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">From/To</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Call Point</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Duration</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {callSessions.map((session) => (
                <tr key={session.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {new Date(session.started_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      session.direction === 'inbound'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}>
                      {session.direction}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div className="font-mono text-gray-900 dark:text-white">{session.from_number}</div>
                      <div className="font-mono text-gray-500 dark:text-gray-400">{session.to_number}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {session.call_point_name || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {session.duration_seconds ? `${session.duration_seconds}s` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      session.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : session.status === 'failed'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                    }`}>
                      {session.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSelectSession(session)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Settings Tab
// ============================================================================

interface SettingsTabProps {
  credentials: any;
  loading: boolean;
  testingConnection: boolean;
  onTestConnection: (provider: string) => void;
  onRefresh: () => void;
}

function SettingsTab({ credentials, loading, testingConnection, onTestConnection, onRefresh }: SettingsTabProps) {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Telephony Settings</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Twilio Settings */}
          <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Twilio</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Primary telephony provider
                </p>
              </div>
              {credentials?.twilio?.configured ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-gray-400" />
              )}
            </div>

            {credentials?.twilio?.configured ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account SID</label>
                  <div className="mt-1 font-mono text-sm text-gray-600 dark:text-gray-400">
                    {credentials.twilio.accountSid}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Auth Token</label>
                  <div className="mt-1 font-mono text-sm text-gray-600 dark:text-gray-400">
                    {credentials.twilio.authToken || '••••••••••••••••'}
                  </div>
                </div>
                <button
                  onClick={() => onTestConnection('twilio')}
                  disabled={testingConnection}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {testingConnection ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                  Test Connection
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No Twilio credentials configured
                </p>
                <a
                  href="/dashboard/settings/credentials"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Configure Credentials
                </a>
              </div>
            )}
          </div>

          {/* Google Voice Settings */}
          <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Google Voice</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Alternative telephony provider
                </p>
              </div>
              {credentials?.google?.configured ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-gray-400" />
              )}
            </div>

            <div className="text-center py-6">
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Google Voice integration coming soon
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Use Twilio for now
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
