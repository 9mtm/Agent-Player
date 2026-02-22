/**
 * Inbox Page - Messages List
 * Shows all inbox messages with filtering and actions
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Inbox, CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react';

interface InboxMessage {
  id: string;
  user_id: string;
  source_type: string;
  message: string;
  status: string;
  risk_level?: string;
  auto_executed?: boolean;
  received_at: string;
  result?: any;
}

export default function InboxPage() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const userId = 'test-user-123'; // TODO: Get from auth context

  useEffect(() => {
    fetchMessages();
  }, [filter]);

  async function fetchMessages() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ userId });
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/inbox?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setMessages(data.messages || []);
      } else {
        console.error('Failed to fetch messages:', data.error);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'needs_approval':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  }

  function getRiskBadge(level?: string) {
    if (!level) return null;

    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={colors[level as keyof typeof colors] || ''}>
        {level.toUpperCase()}
      </Badge>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Inbox className="h-8 w-8" />
            Inbox
          </h1>
          <p className="text-muted-foreground">
            Smart inbox with auto-execution and approval workflows
          </p>
        </div>

        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Messages</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="needs_approval">Needs Approval</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Messages List */}
      {loading ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Loading messages...</p>
          </CardContent>
        </Card>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No messages found
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <Card key={msg.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(msg.status)}
                    <div>
                      <CardTitle className="text-lg">{msg.message}</CardTitle>
                      <CardDescription className="mt-1">
                        From {msg.source_type} • {new Date(msg.received_at).toLocaleString()}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {getRiskBadge(msg.risk_level)}
                    {msg.auto_executed && (
                      <Badge variant="outline">Auto-executed</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              {msg.result && (
                <CardContent>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium mb-1">Result:</p>
                    <p className="text-sm text-muted-foreground">
                      {typeof msg.result === 'string'
                        ? msg.result
                        : JSON.stringify(msg.result, null, 2)}
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
