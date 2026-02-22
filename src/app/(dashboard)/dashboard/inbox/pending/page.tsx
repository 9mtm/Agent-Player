/**
 * Inbox Pending Approvals Page
 * Shows messages waiting for user approval
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PendingMessage {
  id: string;
  message: string;
  source_type: string;
  risk_level?: string;
  received_at: string;
}

export default function PendingApprovalsPage() {
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<PendingMessage | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'deny' | null>(null);
  const [processing, setProcessing] = useState(false);
  const userId = 'test-user-123'; // TODO: Get from auth context

  useEffect(() => {
    fetchPendingMessages();
  }, []);

  async function fetchPendingMessages() {
    try {
      setLoading(true);
      const response = await fetch(`/api/inbox/approvals?userId=${userId}`);
      const data = await response.json();

      if (response.ok) {
        setMessages(data.messages || []);
      } else {
        console.error('Failed to fetch pending messages:', data.error);
      }
    } catch (error) {
      console.error('Error fetching pending messages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(messageId: string, action: 'approve' | 'deny') {
    try {
      setProcessing(true);
      const response = await fetch(`/api/inbox/${messageId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: action === 'approve' ? 'approved' : 'denied',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh list
        await fetchPendingMessages();
        setSelectedMessage(null);
        setActionType(null);
      } else {
        console.error(`Failed to ${action} message:`, data.error);
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing message:`, error);
      toast.error(`Error: ${error}`);
    } finally {
      setProcessing(false);
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
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-8 w-8 text-orange-500" />
          Pending Approvals
        </h1>
        <p className="text-muted-foreground">
          Review and approve/deny risky actions
        </p>
      </div>

      {/* Pending Count Alert */}
      {messages.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            You have <strong>{messages.length}</strong> message{messages.length !== 1 ? 's' : ''} waiting for approval
          </AlertDescription>
        </Alert>
      )}

      {/* Messages List */}
      {loading ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Loading pending messages...</p>
          </CardContent>
        </Card>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-muted-foreground">No messages need your approval</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <Card key={msg.id} className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{msg.message}</CardTitle>
                    <CardDescription className="mt-1">
                      From {msg.source_type} • {new Date(msg.received_at).toLocaleString()}
                    </CardDescription>
                  </div>

                  {getRiskBadge(msg.risk_level)}
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setSelectedMessage(msg);
                      setActionType('approve');
                    }}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve & Execute
                  </Button>

                  <Button
                    onClick={() => {
                      setSelectedMessage(msg);
                      setActionType('deny');
                    }}
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Deny
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedMessage && !!actionType} onOpenChange={() => {
        setSelectedMessage(null);
        setActionType(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' ? 'Approve & Execute?' : 'Deny Message?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve' ? (
                <>
                  This will execute the action: <strong>{selectedMessage?.message}</strong>
                  <br /><br />
                  The agent will perform this task immediately.
                </>
              ) : (
                <>
                  This will deny the action: <strong>{selectedMessage?.message}</strong>
                  <br /><br />
                  The message will be marked as denied and no action will be taken.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedMessage && actionType) {
                  handleAction(selectedMessage.id, actionType);
                }
              }}
              disabled={processing}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Deny'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
