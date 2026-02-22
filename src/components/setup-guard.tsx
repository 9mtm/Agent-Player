'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Global flag to prevent multiple checks across all instances
let globalCheckInProgress = false;
let globalSetupStatus: { complete: boolean; checked: boolean } = {
  complete: false,
  checked: false
};

export function SetupGuard({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(!globalSetupStatus.checked);
  const [setupComplete, setSetupComplete] = useState(globalSetupStatus.complete);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const checkSetupStatus = async () => {
      // Use global status if already checked
      if (globalSetupStatus.checked) {
        console.log('[SetupGuard] Using cached setup status:', globalSetupStatus.complete);
        setSetupComplete(globalSetupStatus.complete);
        setIsChecking(false);

        // Handle redirects based on cached status
        if (globalSetupStatus.complete && pathname === '/setup') {
          console.log('[SetupGuard] Redirecting to /login (setup already complete)');
          router.push('/login');
        } else if (!globalSetupStatus.complete && pathname !== '/setup') {
          console.log('[SetupGuard] Redirecting to /setup (setup not complete)');
          router.push('/setup');
        }
        return;
      }

      // Prevent multiple simultaneous checks
      if (globalCheckInProgress) {
        console.log('[SetupGuard] Check already in progress, waiting...');
        return;
      }

      globalCheckInProgress = true;

      try {
        console.log('[SetupGuard] Checking setup status...');
        const response = await fetch('http://localhost:41522/api/setup/status', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-cache'
        });

        if (!response.ok) {
          console.log('[SetupGuard] Backend not responding, allowing access');
          globalSetupStatus = { complete: true, checked: true };
          if (mounted) {
            setSetupComplete(true);
            setIsChecking(false);
          }
          globalCheckInProgress = false;
          return;
        }

        const data = await response.json();
        console.log('[SetupGuard] Setup status:', data);

        globalSetupStatus = { complete: data.setupComplete, checked: true };

        if (mounted) {
          setSetupComplete(data.setupComplete);
          setIsChecking(false);

          // Handle redirects
          if (data.setupComplete && pathname === '/setup') {
            console.log('[SetupGuard] Redirecting to /login (setup already complete)');
            router.push('/login');
          } else if (!data.setupComplete && pathname !== '/setup') {
            console.log('[SetupGuard] Redirecting to /setup (setup not complete)');
            router.push('/setup');
          }
        }
      } catch (error) {
        console.error('[SetupGuard] Setup status check failed:', error);
        globalSetupStatus = { complete: true, checked: true };
        if (mounted) {
          setSetupComplete(true);
          setIsChecking(false);
        }
      } finally {
        globalCheckInProgress = false;
      }
    };

    checkSetupStatus();

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  // Show loading screen while checking setup status
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking system status...</p>
        </div>
      </div>
    );
  }

  // If on setup page, always render (setup page handles its own logic)
  if (pathname === '/setup') {
    return <>{children}</>;
  }

  // If setup is complete, render children
  if (setupComplete) {
    return <>{children}</>;
  }

  // If setup is not complete and not on setup page, show loading (will redirect)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to setup...</p>
      </div>
    </div>
  );
}
