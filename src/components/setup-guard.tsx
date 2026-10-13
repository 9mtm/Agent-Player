'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { config } from '@/lib/config';
import { firstRunRedirect, parseSetupStatus } from '@/lib/auth/first-run';

// Setup status for this page load (null = backend could not be asked).
// A full page load (e.g. after the wizard finishes) asks again.
let cachedStatus: { setupComplete: boolean | null } | null = null;
let pending: Promise<boolean | null> | null = null;

async function fetchSetupStatus(): Promise<boolean | null> {
  if (cachedStatus) return cachedStatus.setupComplete;
  if (!pending) {
    pending = fetch(`${config.backendUrl}/api/setup/status`, { cache: 'no-store' })
      .then(res => (res.ok ? res.json().then(parseSetupStatus) : null))
      .catch(() => null)
      .then(setupComplete => {
        cachedStatus = { setupComplete };
        pending = null;
        return setupComplete;
      });
  }
  return pending;
}

/**
 * F-01: mounted in the root layout, outside the auth provider, so that on a
 * fresh install every page goes to /setup before any sign-in redirect runs.
 */
export function SetupGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const [setupComplete, setSetupComplete] = useState<boolean | null | undefined>(
    cachedStatus ? cachedStatus.setupComplete : undefined
  );

  useEffect(() => {
    let mounted = true;
    fetchSetupStatus().then(status => {
      if (mounted) setSetupComplete(status);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const target = setupComplete === undefined ? null : firstRunRedirect(pathname, setupComplete);

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (setupComplete === undefined || target) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {setupComplete === undefined ? 'Checking system status...' : 'Redirecting...'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
