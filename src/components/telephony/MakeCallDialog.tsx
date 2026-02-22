'use client';

import { useState, useEffect } from 'react';
import { X, Phone, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { config } from '@/lib/config';

interface MakeCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MakeCallDialog({ isOpen, onClose, onSuccess }: MakeCallDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callPoints, setCallPoints] = useState<any[]>([]);

  // Form fields
  const [callPointId, setCallPointId] = useState('');
  const [toNumber, setToNumber] = useState('');
  const [customGreeting, setCustomGreeting] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCallPoints();
      resetForm();
    }
  }, [isOpen]);

  const loadCallPoints = async () => {
    try {
      const response = await fetch('${config.backendUrl}/api/telephony/call-points');
      const data = await response.json();
      const enabledCallPoints = (data.callPoints || []).filter((cp: any) => cp.enabled);
      setCallPoints(enabledCallPoints);
    } catch (err) {
      console.error('Failed to load call points:', err);
    }
  };

  const resetForm = () => {
    setCallPointId('');
    setToNumber('');
    setCustomGreeting('');
    setError(null);
  };

  const handleMakeCall = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!callPointId) {
        throw new Error('Please select a call point');
      }

      if (!toNumber) {
        throw new Error('Please enter a phone number');
      }

      // Validate phone number format (basic E.164 check)
      if (!toNumber.match(/^\+?[1-9]\d{1,14}$/)) {
        throw new Error('Please enter a valid phone number (E.164 format: +1234567890)');
      }

      const response = await fetch('${config.backendUrl}/api/telephony/calls/make', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callPointId,
          toNumber,
          customGreeting: customGreeting || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate call');
      }

      const data = await response.json();

      // Success!
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to make call');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectedCallPoint = callPoints.find((cp) => cp.id === callPointId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Make Outbound Call</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Initiate a call from a call point to any phone number
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-800 dark:text-red-200 text-sm">{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Call Point <span className="text-red-600">*</span>
            </label>
            <select
              value={callPointId}
              onChange={(e) => setCallPointId(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
            >
              <option value="">Select a call point</option>
              {callPoints.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name} ({cp.phoneNumber || 'No number'})
                </option>
              ))}
            </select>
            {callPoints.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                No enabled call points available. Create and enable a call point first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To Phone Number <span className="text-red-600">*</span>
            </label>
            <input
              type="tel"
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Use E.164 format (e.g., +1234567890)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Greeting (Optional)
            </label>
            <textarea
              value={customGreeting}
              onChange={(e) => setCustomGreeting(e.target.value)}
              placeholder="Leave blank to use the call point's default greeting"
              rows={3}
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>

          {selectedCallPoint && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Call Preview</h4>
              <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <p>
                  <strong>From:</strong> {selectedCallPoint.phoneNumber || 'Unknown'}
                </p>
                <p>
                  <strong>To:</strong> {toNumber || '(not entered)'}
                </p>
                <p>
                  <strong>Voice:</strong> {selectedCallPoint.voiceId} ({selectedCallPoint.voiceProvider})
                </p>
                <p>
                  <strong>Agent:</strong> {selectedCallPoint.agentName || 'Default behavior'}
                </p>
                <p className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                  <strong>Greeting:</strong>{' '}
                  {customGreeting || selectedCallPoint.greetingMessage || 'Default greeting'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleMakeCall}
            disabled={loading || !callPointId || !toNumber}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Calling...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                Make Call
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
