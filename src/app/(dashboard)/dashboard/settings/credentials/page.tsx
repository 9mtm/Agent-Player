'use client';

import { useEffect, useState } from 'react';
import { credentialsAPI, type Credential, type CredentialType } from '@/lib/backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Shield,
  Plus,
  Trash2,
  Download,
  Upload,
  Eye,
  EyeOff,
  Key,
  Lock,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const CREDENTIAL_TYPES: { value: CredentialType; label: string; icon: any }[] = [
  { value: 'api_key', label: 'API Key', icon: Key },
  { value: 'oauth_token', label: 'OAuth Token', icon: Lock },
  { value: 'password', label: 'Password', icon: Shield },
  { value: 'secret', label: 'Secret', icon: AlertTriangle }
];

// Suggested credential key names grouped by service
const SUGGESTED_KEYS = [
  // Twilio (Telephony)
  { category: 'Twilio', key: 'telephony.twilio.account_sid', description: 'Twilio Account SID' },
  { category: 'Twilio', key: 'telephony.twilio.auth_token', description: 'Twilio Auth Token' },
  { category: 'Twilio', key: 'telephony.public_url', description: 'Public webhook URL (ngrok)' },

  // Google Cloud
  { category: 'Google', key: 'telephony.google.project_id', description: 'Google Cloud Project ID' },
  { category: 'Google', key: 'telephony.google.credentials_json', description: 'Google Service Account JSON' },
  { category: 'Google', key: 'google.api_key', description: 'Google API Key' },

  // OpenAI
  { category: 'OpenAI', key: 'openai.api_key', description: 'OpenAI API Key' },
  { category: 'OpenAI', key: 'openai.organization_id', description: 'OpenAI Organization ID' },

  // Anthropic (Claude)
  { category: 'Anthropic', key: 'anthropic.api_key', description: 'Anthropic API Key' },

  // GitHub
  { category: 'GitHub', key: 'github.token', description: 'GitHub Personal Access Token' },
  { category: 'GitHub', key: 'github.webhook_secret', description: 'GitHub Webhook Secret' },

  // Messaging Platforms
  { category: 'Discord', key: 'discord.bot_token', description: 'Discord Bot Token' },
  { category: 'Discord', key: 'discord.client_id', description: 'Discord Client ID' },
  { category: 'Slack', key: 'slack.bot_token', description: 'Slack Bot Token' },
  { category: 'Slack', key: 'slack.webhook_url', description: 'Slack Webhook URL' },
  { category: 'Telegram', key: 'telegram.bot_token', description: 'Telegram Bot Token' },
  { category: 'WhatsApp', key: 'whatsapp.api_key', description: 'WhatsApp Business API Key' },

  // Email
  { category: 'Email', key: 'email.smtp_host', description: 'SMTP Host' },
  { category: 'Email', key: 'email.smtp_username', description: 'SMTP Username' },
  { category: 'Email', key: 'email.smtp_password', description: 'SMTP Password' },

  // Database
  { category: 'Database', key: 'db.connection_string', description: 'Database Connection String' },
  { category: 'Database', key: 'db.api_key', description: 'Database API Key' },

  // OAuth Services (Gmail, Outlook)
  { category: 'Gmail OAuth', key: 'gmail.client_id', description: 'Gmail OAuth Client ID' },
  { category: 'Gmail OAuth', key: 'gmail.client_secret', description: 'Gmail OAuth Client Secret' },
  { category: 'Gmail OAuth', key: 'gmail.redirect_uri', description: 'Gmail OAuth Redirect URI' },
  { category: 'Outlook OAuth', key: 'outlook.client_id', description: 'Outlook OAuth Client ID' },
  { category: 'Outlook OAuth', key: 'outlook.client_secret', description: 'Outlook OAuth Client Secret' },
  { category: 'Outlook OAuth', key: 'outlook.redirect_uri', description: 'Outlook OAuth Redirect URI' },

  // Cloud Storage
  { category: 'AWS S3', key: 's3.access_key_id', description: 'AWS S3 Access Key ID' },
  { category: 'AWS S3', key: 's3.secret_access_key', description: 'AWS S3 Secret Access Key' },
  { category: 'AWS S3', key: 's3.region', description: 'AWS S3 Region (e.g., us-east-1)' },
  { category: 'AWS S3', key: 's3.bucket', description: 'AWS S3 Bucket Name' },
  { category: 'Cloudflare R2', key: 'r2.access_key_id', description: 'Cloudflare R2 Access Key ID' },
  { category: 'Cloudflare R2', key: 'r2.secret_access_key', description: 'Cloudflare R2 Secret Access Key' },
  { category: 'Cloudflare R2', key: 'r2.endpoint', description: 'Cloudflare R2 Endpoint URL' },
  { category: 'Cloudflare R2', key: 'r2.bucket', description: 'Cloudflare R2 Bucket Name' },

  // Payment & Billing
  { category: 'Stripe', key: 'stripe.api_key', description: 'Stripe API Key' },
  { category: 'Stripe', key: 'stripe.webhook_secret', description: 'Stripe Webhook Secret' },
  { category: 'Stripe', key: 'stripe.publishable_key', description: 'Stripe Publishable Key' },

  // Email Services
  { category: 'SendGrid', key: 'sendgrid.api_key', description: 'SendGrid API Key' },
  { category: 'SendGrid', key: 'sendgrid.from_email', description: 'SendGrid From Email' },
  { category: 'Mailgun', key: 'mailgun.api_key', description: 'Mailgun API Key' },
  { category: 'Mailgun', key: 'mailgun.domain', description: 'Mailgun Domain' },

  // Social Media APIs
  { category: 'Twitter/X', key: 'twitter.api_key', description: 'Twitter API Key' },
  { category: 'Twitter/X', key: 'twitter.api_secret', description: 'Twitter API Secret' },
  { category: 'Twitter/X', key: 'twitter.bearer_token', description: 'Twitter Bearer Token' },
  { category: 'Facebook', key: 'facebook.app_id', description: 'Facebook App ID' },
  { category: 'Facebook', key: 'facebook.app_secret', description: 'Facebook App Secret' },
  { category: 'Facebook', key: 'facebook.access_token', description: 'Facebook Access Token' },

  // Analytics & Monitoring
  { category: 'Google Analytics', key: 'analytics.tracking_id', description: 'Google Analytics Tracking ID' },
  { category: 'Google Analytics', key: 'analytics.measurement_id', description: 'Google Analytics Measurement ID' },
  { category: 'Sentry', key: 'sentry.dsn', description: 'Sentry DSN (Error Tracking)' },
  { category: 'Sentry', key: 'sentry.auth_token', description: 'Sentry Auth Token' },

  // AI & ML Services
  { category: 'Hugging Face', key: 'huggingface.api_key', description: 'Hugging Face API Key' },
  { category: 'Replicate', key: 'replicate.api_key', description: 'Replicate API Key' },
  { category: 'Cohere', key: 'cohere.api_key', description: 'Cohere API Key' },

  // Web3 & Blockchain
  { category: 'Alchemy', key: 'alchemy.api_key', description: 'Alchemy API Key (Web3)' },
  { category: 'Infura', key: 'infura.project_id', description: 'Infura Project ID (Ethereum)' },
];

export default function CredentialsManager() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add credential state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCredential, setNewCredential] = useState({
    name: '',
    type: 'api_key' as CredentialType,
    value: '',
    description: ''
  });

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState(SUGGESTED_KEYS);

  // Export/Import state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importData, setImportData] = useState('');
  const [exportedData, setExportedData] = useState('');

  // View decrypted value state
  const [viewingValue, setViewingValue] = useState<{ id: string; value: string } | null>(null);

  const loadCredentials = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await credentialsAPI.list();
      setCredentials(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const handleAdd = async () => {
    if (!newCredential.name || !newCredential.value) {
      toast.error('Name and value are required');
      return;
    }

    try {
      await credentialsAPI.create({
        name: newCredential.name,
        type: newCredential.type,
        value: newCredential.value,
        description: newCredential.description
      });

      setShowAddDialog(false);
      setNewCredential({ name: '', type: 'api_key', value: '', description: '' });
      loadCredentials();
      toast.success('Credential saved securely!');
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete credential "${name}"?`)) return;

    try {
      await credentialsAPI.delete(id);
      loadCredentials();
      toast.success('Credential deleted successfully');
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const handleExport = async () => {
    if (!exportPassword) {
      toast.error('Password is required for export');
      return;
    }

    try {
      const result = await credentialsAPI.export(exportPassword);
      setExportedData(result.data);
      toast.success('Credentials exported! Copy the data below.');
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    }
  };

  const handleImport = async () => {
    if (!importPassword || !importData) {
      toast.error('Password and data are required');
      return;
    }

    try {
      const result = await credentialsAPI.import(importData, importPassword);
      toast.success(`Imported ${result.imported} credentials!`);
      setShowImportDialog(false);
      setImportPassword('');
      setImportData('');
      loadCredentials();
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    }
  };

  const handleViewValue = async (id: string) => {
    try {
      const cred = await credentialsAPI.get(id, true); // decrypt=true

      if ('value' in cred) {
        setViewingValue({ id, value: cred.value });

        // Auto-hide after 10 seconds
        setTimeout(() => {
          if (viewingValue?.id === id) {
            setViewingValue(null);
          }
        }, 10000);
      }
    } catch (err: any) {
      toast.error(`Failed to decrypt: ${err.message}`);
    }
  };

  if (loading && credentials.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-green-500" />
            Credentials Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Securely store and manage API keys, tokens, and passwords (AES-256-GCM)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadCredentials} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Credential
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Credential</DialogTitle>
                <DialogDescription>
                  Securely store API keys, tokens, or passwords
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="relative">
                  <Label>Name *</Label>
                  <Input
                    value={newCredential.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewCredential({ ...newCredential, name: value });

                      // Filter suggestions based on input
                      if (value.length > 0) {
                        const filtered = SUGGESTED_KEYS.filter(
                          s => s.key.toLowerCase().includes(value.toLowerCase()) ||
                               s.category.toLowerCase().includes(value.toLowerCase()) ||
                               s.description.toLowerCase().includes(value.toLowerCase())
                        );
                        setFilteredSuggestions(filtered);
                        setShowSuggestions(filtered.length > 0);
                      } else {
                        setFilteredSuggestions(SUGGESTED_KEYS);
                        setShowSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                      if (newCredential.name.length === 0) {
                        setFilteredSuggestions(SUGGESTED_KEYS);
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay to allow click on suggestion
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    placeholder="e.g., telephony.twilio.account_sid"
                    className="mt-1"
                  />

                  {/* Suggestions Dropdown */}
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {/* Group by category */}
                      {Object.entries(
                        filteredSuggestions.reduce((acc, item) => {
                          if (!acc[item.category]) acc[item.category] = [];
                          acc[item.category].push(item);
                          return acc;
                        }, {} as Record<string, typeof SUGGESTED_KEYS>)
                      ).map(([category, items]) => (
                        <div key={category} className="border-b last:border-b-0">
                          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-600 dark:text-gray-400">
                            {category}
                          </div>
                          {items.map((suggestion) => (
                            <button
                              key={suggestion.key}
                              type="button"
                              onClick={() => {
                                setNewCredential({
                                  ...newCredential,
                                  name: suggestion.key,
                                  description: suggestion.description
                                });
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <div className="font-mono text-sm text-blue-600 dark:text-blue-400">
                                {suggestion.key}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {suggestion.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Type *</Label>
                  <select
                    value={newCredential.type}
                    onChange={(e) => setNewCredential({ ...newCredential, type: e.target.value as CredentialType })}
                    className="w-full p-2 border rounded-md mt-1"
                  >
                    {CREDENTIAL_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Value * (will be encrypted)</Label>
                  <Input
                    type="password"
                    value={newCredential.value}
                    onChange={(e) => setNewCredential({ ...newCredential, value: e.target.value })}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="mt-1 font-mono"
                  />
                </div>

                <div>
                  <Label>Description (optional)</Label>
                  <Input
                    value={newCredential.description}
                    onChange={(e) => setNewCredential({ ...newCredential, description: e.target.value })}
                    placeholder="For GitHub integration"
                    className="mt-1"
                  />
                </div>

                <Alert>
                  <AlertDescription className="text-xs">
                    🔒 Your credential will be encrypted using AES-256-GCM before storage.
                    Never stored in plain text.
                  </AlertDescription>
                </Alert>

                <Button onClick={handleAdd} className="w-full">
                  <Lock className="w-4 h-4 mr-2" />
                  Save Securely
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Security Notice */}
      <Alert>
        <Shield className="w-4 h-4" />
        <AlertDescription>
          <strong>Security:</strong> All credentials are encrypted using AES-256-GCM encryption.
          Decrypted values are only shown temporarily when you click &quot;View&quot;.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{credentials.length}</div>
          </CardContent>
        </Card>

        {CREDENTIAL_TYPES.map((type) => {
          const count = credentials.filter(c => c.type === type.value).length;
          const Icon = type.icon;
          return (
            <Card key={type.value}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {type.label}s
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Credentials List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stored Credentials</CardTitle>
              <CardDescription>
                Encrypted API keys, tokens, and secrets
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Credentials</DialogTitle>
                    <DialogDescription>
                      Create an encrypted backup of all credentials
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Password for encryption *</Label>
                      <Input
                        type="password"
                        value={exportPassword}
                        onChange={(e) => setExportPassword(e.target.value)}
                        placeholder="Enter a strong password"
                        className="mt-1"
                      />
                    </div>

                    <Button onClick={handleExport} className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Export with Password
                    </Button>

                    {exportedData && (
                      <div>
                        <Label>Exported Data (copy this)</Label>
                        <textarea
                          value={exportedData}
                          readOnly
                          className="w-full p-2 border rounded-md mt-1 h-32 font-mono text-xs"
                          onClick={(e) => e.currentTarget.select()}
                        />
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Credentials</DialogTitle>
                    <DialogDescription>
                      Restore credentials from encrypted backup
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Exported Data *</Label>
                      <textarea
                        value={importData}
                        onChange={(e) => setImportData(e.target.value)}
                        placeholder="Paste exported data here..."
                        className="w-full p-2 border rounded-md mt-1 h-32 font-mono text-xs"
                      />
                    </div>

                    <div>
                      <Label>Password *</Label>
                      <Input
                        type="password"
                        value={importPassword}
                        onChange={(e) => setImportPassword(e.target.value)}
                        placeholder="Enter the password used for export"
                        className="mt-1"
                      />
                    </div>

                    <Button onClick={handleImport} className="w-full">
                      <Upload className="w-4 h-4 mr-2" />
                      Import Credentials
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {credentials.map((credential) => {
              const typeInfo = CREDENTIAL_TYPES.find(t => t.value === credential.type);
              const Icon = typeInfo?.icon || Key;
              const isViewing = viewingValue?.id === credential.id;

              return (
                <div
                  key={credential.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4" />
                        <h3 className="font-semibold">{credential.name}</h3>
                        <Badge variant="outline">{typeInfo?.label}</Badge>
                      </div>

                      {credential.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {credential.description}
                        </p>
                      )}

                      {isViewing && (
                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded">
                          <p className="text-xs font-mono break-all">
                            {viewingValue.value}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Will auto-hide in 10 seconds
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        Created: {new Date(credential.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (isViewing) {
                            setViewingValue(null);
                          } else {
                            handleViewValue(credential.id);
                          }
                        }}
                      >
                        {isViewing ? (
                          <><EyeOff className="w-4 h-4 mr-1" /> Hide</>
                        ) : (
                          <><Eye className="w-4 h-4 mr-1" /> View</>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(credential.id, credential.name)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {credentials.length === 0 && (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  No credentials stored yet
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Credential
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
