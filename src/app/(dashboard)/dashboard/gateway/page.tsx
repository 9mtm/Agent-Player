'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { gatewayAPI, type GatewayChannel, type GatewayMessage, type GatewaySession } from '@/lib/backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Network,
  MessageSquare,
  Users,
  RefreshCw,
  Send,
  CheckCircle2,
  XCircle,
  Activity
} from 'lucide-react';

export default function GatewayDashboard() {
  const [channels, setChannels] = useState<GatewayChannel[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [sessions, setSessions] = useState<{ [userId: string]: GatewaySession }>({});
  const [history, setHistory] = useState<GatewayMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testUserId, setTestUserId] = useState('test-user');
  const [testMessage, setTestMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load gateway status and channels
      const [statusData, channelsData] = await Promise.all([
        gatewayAPI.getStatus(),
        gatewayAPI.getChannels()
      ]);

      setStatus(statusData);
      setChannels(channelsData);

      // Load sample session if exists
      try {
        const session = await gatewayAPI.getSession(testUserId);
        setSessions({ [testUserId]: session });

        // Load history for this user
        const historyData = await gatewayAPI.getHistory(testUserId, 50);
        setHistory(historyData);
      } catch (err) {
        // No session yet
        console.log('No session found for test user');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load gateway data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const sendTestMessage = async () => {
    if (!testMessage.trim()) return;

    setSending(true);
    try {
      const result = await gatewayAPI.sendMessage(testUserId, testMessage);

      // Reload data to show new message
      await loadData();

      setTestMessage('');
      toast.success(`Message sent! Session ID: ${result.sessionId}`);
    } catch (err: any) {
      toast.error(`Failed to send: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Gateway...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadData} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const connectedChannels = channels.filter(c => c.connected).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Network className="w-8 h-8" />
            Multi-Interface Gateway
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage conversations across all channels with shared context
          </p>
        </div>
        <Button onClick={loadData} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Gateway Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.running ? (
                <Badge variant="default" className="text-sm">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Running
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-sm">
                  <XCircle className="w-3 h-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="w-4 h-4" />
              Active Channels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connectedChannels} / {channels.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              channels connected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(sessions).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              user sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {history.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              in history
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="history">Conversation History</TabsTrigger>
          <TabsTrigger value="test">Test Gateway</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registered Channels</CardTitle>
              <CardDescription>
                All channels that can receive and send messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        channel.connected ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <div>
                        <p className="font-medium">{channel.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {channel.id}
                        </p>
                      </div>
                    </div>
                    <Badge variant={channel.connected ? 'default' : 'secondary'}>
                      {channel.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                ))}

                {channels.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No channels registered
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversation History</CardTitle>
              <CardDescription>
                Messages from all channels with context preservation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {history.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-blue-50 dark:bg-blue-950/30'
                          : 'bg-gray-50 dark:bg-gray-900'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={msg.role === 'user' ? 'default' : 'secondary'}>
                            {msg.role === 'user' ? 'User' : 'Agent'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {msg.channelId}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}

                  {history.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No conversation history yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Gateway</CardTitle>
              <CardDescription>
                Send a test message through the gateway
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">User ID</label>
                <Input
                  value={testUserId}
                  onChange={(e) => setTestUserId(e.target.value)}
                  placeholder="test-user"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Message</label>
                <Input
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Hello Gateway!"
                  className="mt-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !sending) {
                      sendTestMessage();
                    }
                  }}
                />
              </div>

              <Button
                onClick={sendTestMessage}
                disabled={sending || !testMessage.trim()}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {sending ? 'Sending...' : 'Send Test Message'}
              </Button>

              {Object.values(sessions).length > 0 && (
                <Alert>
                  <AlertDescription>
                    <strong>Session Active:</strong> {Object.values(sessions)[0]?.sessionId}
                    <br />
                    <span className="text-sm text-muted-foreground">
                      Messages: {Object.values(sessions)[0]?.conversationCount || 0}
                    </span>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gateway Configuration</CardTitle>
              <CardDescription>
                Current gateway settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status?.config && (
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Session Timeout</span>
                    <span className="text-muted-foreground">
                      {Math.floor(status.config.sessionTimeout / 1000 / 60)} minutes
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Max History Size</span>
                    <span className="text-muted-foreground">
                      {status.config.maxHistorySize} messages
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Sync Across Channels</span>
                    <Badge variant={status.config.syncAcrossChannels ? 'default' : 'secondary'}>
                      {status.config.syncAcrossChannels ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Notify All Channels</span>
                    <Badge variant={status.config.notifyAllChannels ? 'default' : 'secondary'}>
                      {status.config.notifyAllChannels ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-medium">Storage Directory</span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {status.config.storageDir}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
