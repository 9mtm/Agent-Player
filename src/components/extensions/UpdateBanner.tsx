'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { config } from '@/lib/config';
import { toast } from 'sonner';

const API_URL = config.backendUrl;

interface Update {
  extension_id: string;
  name: string;
  current_version: string;
  latest_version: string;
  changelog?: string;
}

interface UpdateBannerProps {
  /** Auto-check for updates on mount */
  autoCheck?: boolean;
  /** Show as compact banner */
  compact?: boolean;
}

export function UpdateBanner({ autoCheck = true, compact = false }: UpdateBannerProps) {
  const [loading, setLoading] = useState(false);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (autoCheck && !dismissed) {
      checkForUpdates();
    }
  }, [autoCheck]);

  const checkForUpdates = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/marketplace/updates`);
      const data = await res.json();

      if (data.success) {
        setUpdates(data.updates || []);
      }
    } catch (err: any) {
      console.error('Failed to check for updates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAll = async () => {
    try {
      setUpdating(true);

      const res = await fetch(`${API_URL}/api/marketplace/auto-queue-updates`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`${data.queued} update(s) queued successfully!`);

        if (data.errors && data.errors.length > 0) {
          data.errors.forEach((error: string) => {
            toast.error(error);
          });
        }

        setUpdates([]); // Clear updates after queuing
      } else {
        toast.error('Failed to queue updates');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (dismissed || updates.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {updates.length} extension update(s) available
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleUpdateAll}
              disabled={updating}
            >
              {updating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Download className="h-3 w-3 mr-1" />
                  Update All
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Updates Available
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {updates.length} extension(s) have new versions available
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="text-blue-600 dark:text-blue-400"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {updates.slice(0, 3).map((update) => (
              <div
                key={update.extension_id}
                className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg p-3 border"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{update.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      v{update.current_version}
                    </Badge>
                    <span className="text-xs text-muted-foreground">→</span>
                    <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                      v{update.latest_version}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}

            {updates.length > 3 && (
              <p className="text-xs text-muted-foreground">
                and {updates.length - 3} more...
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleUpdateAll}
              disabled={updating}
              className="flex-1"
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Update All
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleDismiss}>
              Later
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
