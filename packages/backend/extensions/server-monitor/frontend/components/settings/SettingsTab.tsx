'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  TestTube2,
  Server as ServerIcon,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorDisplay } from '../common/ErrorDisplay';

interface ServerConfig {
  id: string;
  name: string;
  type: 'cpanel' | 'ssh';
  host: string;
  username: string;
  api_token?: string;
  password?: string;
  port?: number;
  ssh_enabled?: boolean;
  ssh_host?: string;
  ssh_port?: number;
  ssh_username?: string;
  ssh_password?: string;
  access_level?: 'readonly' | 'readwrite';
  enabled: boolean;
}

interface ServerTypeField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number';
  required: boolean;
  sensitive?: boolean;
  placeholder?: string;
}

const SERVER_TYPE_FIELDS: Record<string, ServerTypeField[]> = {
  cpanel: [
    { key: 'name', label: 'Server Name', type: 'text', required: true, placeholder: 'My cPanel Server' },
    { key: 'host', label: 'WHM/cPanel Host', type: 'text', required: true, placeholder: 'server.example.com' },
    { key: 'username', label: 'WHM Username', type: 'text', required: true, placeholder: 'root' },
    { key: 'api_token', label: 'API Token', type: 'password', required: true, sensitive: true, placeholder: 'Enter WHM API token' },
  ],
  ssh: [
    { key: 'name', label: 'Server Name', type: 'text', required: true, placeholder: 'My SSH Server' },
    { key: 'host', label: 'SSH Host', type: 'text', required: true, placeholder: 'server.example.com' },
    { key: 'port', label: 'SSH Port', type: 'number', required: false, placeholder: '22' },
    { key: 'username', label: 'SSH Username', type: 'text', required: true, placeholder: 'root' },
    { key: 'password', label: 'SSH Password', type: 'password', required: true, sensitive: true, placeholder: 'Enter password' },
  ],
};

const SERVER_TYPE_LABELS: Record<string, string> = {
  cpanel: 'cPanel/WHM',
  ssh: 'SSH Server',
};

export function SettingsTab() {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);
  const [formData, setFormData] = useState<Partial<ServerConfig>>({
    type: 'cpanel',
    enabled: true,
    access_level: 'readonly',
  });
  const [showSshSection, setShowSshSection] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [siteName, setSiteName] = useState('');
  const [savingSiteName, setSavingSiteName] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ext/server-monitor/settings/servers');
      if (!response.ok) throw new Error('Failed to load servers');
      const data = await response.json();
      setServers(data.servers || []);
      setSiteName(data.siteName || '');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingServer(null);
    setFormData({
      type: 'cpanel',
      enabled: true,
      access_level: 'readonly',
    });
    setShowSshSection(false);
    setShowModal(true);
  };

  const openEditModal = (server: ServerConfig) => {
    setEditingServer(server);
    setFormData({
      ...server,
      // Don't show sensitive data in edit mode
      api_token: undefined,
      password: undefined,
      ssh_password: undefined,
    });
    setShowSshSection(!!server.ssh_enabled);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingServer(null);
    setFormData({
      type: 'cpanel',
      enabled: true,
      access_level: 'readonly',
    });
    setShowSshSection(false);
    setShowPasswords({});
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveServer = async () => {
    try {
      // Validation
      const fields = SERVER_TYPE_FIELDS[formData.type || 'cpanel'];
      for (const field of fields) {
        if (field.required && !formData[field.key as keyof ServerConfig]) {
          throw new Error(`${field.label} is required`);
        }
      }

      if (showSshSection) {
        if (!formData.ssh_host) throw new Error('SSH Host is required');
        if (!formData.ssh_username) throw new Error('SSH Username is required');
        if (!formData.ssh_password && !editingServer) throw new Error('SSH Password is required');
      }

      const endpoint = editingServer
        ? `/api/ext/server-monitor/settings/servers/${editingServer.id}`
        : '/api/ext/server-monitor/settings/servers';

      const method = editingServer ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ssh_enabled: showSshSection,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save server');
      }

      await loadSettings();
      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save server');
    }
  };

  const deleteServer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this server?')) return;

    try {
      const response = await fetch(`/api/ext/server-monitor/settings/servers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete server');

      await loadSettings();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete server');
    }
  };

  const testConnection = async (id: string) => {
    try {
      setTestingConnection(id);
      setTestResults(prev => ({ ...prev, [id]: { success: false, message: 'Testing...' } }));

      const response = await fetch(`/api/ext/server-monitor/settings/servers/${id}/test`);
      const data = await response.json();

      setTestResults(prev => ({
        ...prev,
        [id]: {
          success: data.success,
          message: data.message || (data.success ? 'Connection successful' : 'Connection failed'),
        },
      }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [id]: {
          success: false,
          message: err instanceof Error ? err.message : 'Connection test failed',
        },
      }));
    } finally {
      setTestingConnection(null);
    }
  };

  const saveSiteName = async () => {
    try {
      setSavingSiteName(true);
      const response = await fetch('/api/ext/server-monitor/settings/site-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteName }),
      });

      if (!response.ok) throw new Error('Failed to save site name');

      alert('Site name saved successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save site name');
    } finally {
      setSavingSiteName(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadSettings} />;

  return (
    <div className="space-y-6">
      {/* Site Name Section */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Site Name Configuration
        </h3>
        <div className="flex gap-3">
          <Input
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="Enter site name (e.g., My Hosting Company)"
            className="flex-1"
          />
          <Button onClick={saveSiteName} disabled={savingSiteName}>
            {savingSiteName ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          This name will appear in the dashboard header and reports.
        </p>
      </div>

      {/* Server List Section */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ServerIcon className="w-5 h-5" />
            Server Configurations
          </h3>
          <Button onClick={openAddModal} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Server
          </Button>
        </div>

        {servers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ServerIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No servers configured yet.</p>
            <p className="text-sm">Click "Add Server" to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {servers.map((server) => (
              <div
                key={server.id}
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{server.name}</h4>
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                        {SERVER_TYPE_LABELS[server.type]}
                      </span>
                      {!server.enabled && (
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                          Disabled
                        </span>
                      )}
                      {server.access_level === 'readonly' && (
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-xs rounded">
                          Read Only
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Host: {server.host}</p>
                      <p>Username: {server.username}</p>
                      {server.ssh_enabled && (
                        <p className="text-green-600">SSH Enabled</p>
                      )}
                    </div>
                    {testResults[server.id] && (
                      <div className={`mt-2 flex items-center gap-2 text-sm ${
                        testResults[server.id].success ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {testResults[server.id].success ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        {testResults[server.id].message}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testConnection(server.id)}
                      disabled={testingConnection === server.id}
                    >
                      {testingConnection === server.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube2 className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(server)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteServer(server.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">
                {editingServer ? 'Edit Server' : 'Add New Server'}
              </h3>

              <div className="space-y-4">
                {/* Server Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Server Type</label>
                  <select
                    value={formData.type || 'cpanel'}
                    onChange={(e) => handleFieldChange('type', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    disabled={!!editingServer}
                  >
                    <option value="cpanel">cPanel/WHM</option>
                    <option value="ssh">SSH Server</option>
                  </select>
                </div>

                {/* Dynamic Fields */}
                {SERVER_TYPE_FIELDS[formData.type || 'cpanel'].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium mb-2">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <Input
                        type={
                          field.type === 'password' && !showPasswords[field.key]
                            ? 'password'
                            : field.type
                        }
                        value={(formData[field.key as keyof ServerConfig] as string) || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={
                          field.sensitive && editingServer
                            ? '(unchanged)'
                            : field.placeholder
                        }
                      />
                      {field.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(field.key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          {showPasswords[field.key] ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Access Level */}
                <div>
                  <label className="block text-sm font-medium mb-2">Access Level</label>
                  <select
                    value={formData.access_level || 'readonly'}
                    onChange={(e) => handleFieldChange('access_level', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="readonly">Read Only</option>
                    <option value="readwrite">Read & Write</option>
                  </select>
                </div>

                {/* Enabled Checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled !== false}
                    onChange={(e) => handleFieldChange('enabled', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="enabled" className="text-sm font-medium">
                    Server Enabled
                  </label>
                </div>

                {/* Optional SSH Section (only for cPanel) */}
                {formData.type === 'cpanel' && (
                  <div className="border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setShowSshSection(!showSshSection)}
                      className="flex items-center gap-2 text-sm font-medium hover:text-primary"
                    >
                      {showSshSection ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      Optional SSH Configuration (for SFTP/Terminal)
                    </button>

                    {showSshSection && (
                      <div className="mt-4 space-y-4 pl-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">SSH Host</label>
                          <Input
                            value={formData.ssh_host || ''}
                            onChange={(e) => handleFieldChange('ssh_host', e.target.value)}
                            placeholder="server.example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">SSH Port</label>
                          <Input
                            type="number"
                            value={formData.ssh_port || 22}
                            onChange={(e) => handleFieldChange('ssh_port', parseInt(e.target.value))}
                            placeholder="22"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">SSH Username</label>
                          <Input
                            value={formData.ssh_username || ''}
                            onChange={(e) => handleFieldChange('ssh_username', e.target.value)}
                            placeholder="root"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">SSH Password</label>
                          <div className="relative">
                            <Input
                              type={showPasswords['ssh_password'] ? 'text' : 'password'}
                              value={formData.ssh_password || ''}
                              onChange={(e) => handleFieldChange('ssh_password', e.target.value)}
                              placeholder={editingServer ? '(unchanged)' : 'Enter password'}
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('ssh_password')}
                              className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                              {showPasswords['ssh_password'] ? (
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <Eye className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button onClick={saveServer}>
                  {editingServer ? 'Update Server' : 'Add Server'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
