'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { config } from '@/lib/config';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * Dynamic Extension Page Loader
 *
 * This catch-all route handles ALL extension pages dynamically.
 * Extensions are loaded from: packages/backend/extensions/{extensionId}/frontend/page.tsx
 *
 * Flow:
 * 1. Check if extension is enabled (via API)
 * 2. If enabled → Dynamic import from extension directory
 * 3. If disabled/not found → Show error page
 */
export default function ExtensionPage() {
  const params = useParams();
  const extensionId = params.extensionId as string;

  const [Component, setComponent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExtension();
  }, [extensionId]);

  async function loadExtension() {
    try {
      setLoading(true);
      setError(null);

      // 1. Check if extension is enabled
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${config.backendUrl}/api/extensions/${extensionId}/status`, {
        headers,
      });

      if (!res.ok) {
        throw new Error('Extension not found');
      }

      const data = await res.json();

      if (!data.enabled) {
        throw new Error('Extension is not enabled. Please enable it in Extensions settings.');
      }

      // 2. Dynamic import from extension directory
      // Path: packages/backend/extensions/{extensionId}/frontend/page.tsx
      const module = await import(
        `@/../packages/backend/extensions/${extensionId}/frontend/page`
      );

      setComponent(() => module.default);
    } catch (err: any) {
      console.error('[ExtensionPage] Load error:', err);
      setError(err.message || 'Failed to load extension');
    } finally {
      setLoading(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading {extensionId} extension...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Extension Not Available</h1>
        <p className="text-center text-gray-600 max-w-md">{error}</p>

        <div className="flex gap-3 mt-4">
          <a
            href="/dashboard/extensions"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Extensions
          </a>
          <a
            href="/dashboard"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Render extension component
  return Component ? <Component /> : null;
}
