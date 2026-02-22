'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Phone, Bot, MessageSquare, Settings, CheckCircle } from 'lucide-react';
import { config } from '@/lib/config';

interface CallPointWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCallPoint?: any;
}

interface WizardData {
  // Step 1: Basic Info
  name: string;
  description: string;
  phoneNumberId: string;
  provider: string;

  // Step 2: AI Configuration
  agentId: string;
  workflowId: string;
  voiceProvider: string;
  voiceId: string;
  languagePreference: string;

  // Step 3: Call Flow
  greetingMessage: string;
  ivrMenu: any;
  useIvr: boolean;

  // Step 4: Settings
  maxCallDuration: number;
  recordCalls: boolean;
  transcriptionProvider: string;
  businessHours: any;
  afterHoursMessage: string;
  transferNumber: string;
  enabled: boolean;
}

const INITIAL_DATA: WizardData = {
  name: '',
  description: '',
  phoneNumberId: '',
  provider: 'twilio',
  agentId: '',
  workflowId: '',
  voiceProvider: 'openai',
  voiceId: 'alloy',
  languagePreference: 'auto',
  greetingMessage: 'Hello, thank you for calling. How can I help you today?',
  ivrMenu: null,
  useIvr: false,
  maxCallDuration: 600,
  recordCalls: true,
  transcriptionProvider: 'whisper',
  businessHours: null,
  afterHoursMessage: 'We are currently closed. Please call back during business hours.',
  transferNumber: '',
  enabled: true,
};

const VOICE_OPTIONS = [
  { id: 'alloy', name: 'Alloy (Neutral)' },
  { id: 'echo', name: 'Echo (Male)' },
  { id: 'fable', name: 'Fable (Female)' },
  { id: 'onyx', name: 'Onyx (Male)' },
  { id: 'nova', name: 'Nova (Female)' },
  { id: 'shimmer', name: 'Shimmer (Female)' },
];

const TRANSCRIPTION_OPTIONS = [
  { id: 'whisper', name: 'Whisper (Local, Free)' },
  { id: 'twilio', name: 'Twilio (Cloud, $0.05/min)' },
  { id: 'both', name: 'Both (Whisper + Twilio)' },
  { id: 'none', name: 'None (No transcription)' },
];

export function CallPointWizard({ isOpen, onClose, onSuccess, editingCallPoint }: CallPointWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data for available options
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      if (editingCallPoint) {
        // Populate form with existing data
        setData({
          name: editingCallPoint.name || '',
          description: editingCallPoint.description || '',
          phoneNumberId: editingCallPoint.phoneNumberId || '',
          provider: 'twilio',
          agentId: editingCallPoint.agentId || '',
          workflowId: editingCallPoint.workflowId || '',
          voiceProvider: editingCallPoint.voiceProvider || 'openai',
          voiceId: editingCallPoint.voiceId || 'alloy',
          languagePreference: editingCallPoint.languagePreference || 'auto',
          greetingMessage: editingCallPoint.greetingMessage || INITIAL_DATA.greetingMessage,
          ivrMenu: editingCallPoint.ivrMenu || null,
          useIvr: !!editingCallPoint.ivrMenu,
          maxCallDuration: editingCallPoint.maxCallDuration || 600,
          recordCalls: editingCallPoint.recordCalls !== false,
          transcriptionProvider: editingCallPoint.transcriptionProvider || 'whisper',
          businessHours: editingCallPoint.businessHours || null,
          afterHoursMessage: editingCallPoint.afterHoursMessage || INITIAL_DATA.afterHoursMessage,
          transferNumber: editingCallPoint.transferNumber || '',
          enabled: editingCallPoint.enabled !== false,
        });
      } else {
        setData(INITIAL_DATA);
      }
      setCurrentStep(1);
      setError(null);
    }
  }, [isOpen, editingCallPoint]);

  const loadOptions = async () => {
    try {
      // Load phone numbers
      const phoneRes = await fetch('${config.backendUrl}/api/telephony/numbers');
      const phoneData = await phoneRes.json();
      setPhoneNumbers(phoneData.numbers || []);

      // Load agents
      const agentsRes = await fetch('${config.backendUrl}/api/agents');
      const agentsData = await agentsRes.json();
      setAgents(agentsData.agents || []);

      // Load workflows
      const workflowsRes = await fetch('${config.backendUrl}/api/workflows');
      const workflowsData = await workflowsRes.json();
      setWorkflows(workflowsData.workflows || []);
    } catch (err) {
      console.error('Failed to load options:', err);
    }
  };

  const updateData = (field: keyof WizardData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.name.trim() && data.phoneNumberId;
      case 2:
        return true; // Optional fields
      case 3:
        return data.greetingMessage.trim();
      case 4:
        return true; // All optional
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: data.name,
        description: data.description || null,
        phoneNumberId: data.phoneNumberId,
        agentId: data.agentId || null,
        workflowId: data.workflowId || null,
        voiceProvider: data.voiceProvider,
        voiceId: data.voiceId,
        languagePreference: data.languagePreference,
        greetingMessage: data.greetingMessage,
        ivrMenu: data.useIvr ? data.ivrMenu : null,
        maxCallDuration: data.maxCallDuration,
        recordCalls: data.recordCalls,
        transcriptionProvider: data.transcriptionProvider,
        businessHours: data.businessHours,
        afterHoursMessage: data.afterHoursMessage,
        transferNumber: data.transferNumber || null,
        enabled: data.enabled,
      };

      const url = editingCallPoint
        ? `${config.backendUrl}/api/telephony/call-points/${editingCallPoint.id}`
        : '${config.backendUrl}/api/telephony/call-points';

      const method = editingCallPoint ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save call point');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save call point');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {editingCallPoint ? 'Edit Call Point' : 'Create Call Point'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Step {currentStep} of 4
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 px-6 py-4 bg-gray-50 dark:bg-gray-900">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex-1 flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold ${
                  step < currentStep
                    ? 'bg-green-600 text-white'
                    : step === currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
              </div>
              {step < 4 && (
                <div
                  className={`flex-1 h-1 rounded ${
                    step < currentStep ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <Step1BasicInfo
              data={data}
              phoneNumbers={phoneNumbers}
              updateData={updateData}
            />
          )}

          {currentStep === 2 && (
            <Step2AIConfiguration
              data={data}
              agents={agents}
              workflows={workflows}
              updateData={updateData}
            />
          )}

          {currentStep === 3 && (
            <Step3CallFlow
              data={data}
              updateData={updateData}
            />
          )}

          {currentStep === 4 && (
            <Step4Settings
              data={data}
              updateData={updateData}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {currentStep < 4 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !canProceed()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? 'Saving...' : editingCallPoint ? 'Update' : 'Create'}
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step 1: Basic Info
// ============================================================================

interface Step1Props {
  data: WizardData;
  phoneNumbers: any[];
  updateData: (field: keyof WizardData, value: any) => void;
}

function Step1BasicInfo({ data, phoneNumbers, updateData }: Step1Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Phone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Set up the call point name and phone number</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Call Point Name <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => updateData('name', e.target.value)}
          placeholder="e.g., Customer Support Line"
          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <textarea
          value={data.description}
          onChange={(e) => updateData('description', e.target.value)}
          placeholder="Describe this call point (optional)"
          rows={3}
          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Phone Number <span className="text-red-600">*</span>
        </label>
        <select
          value={data.phoneNumberId}
          onChange={(e) => updateData('phoneNumberId', e.target.value)}
          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
        >
          <option value="">Select a phone number</option>
          {phoneNumbers.map((num) => (
            <option key={num.id} value={num.id}>
              {num.phoneNumber} {num.friendlyName ? `(${num.friendlyName})` : ''}
            </option>
          ))}
        </select>
        {phoneNumbers.length === 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
            No phone numbers available. Purchase a number first in the Phone Numbers tab.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Step 2: AI Configuration
// ============================================================================

interface Step2Props {
  data: WizardData;
  agents: any[];
  workflows: any[];
  updateData: (field: keyof WizardData, value: any) => void;
}

function Step2AIConfiguration({ data, agents, workflows, updateData }: Step2Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Configuration</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Configure AI agent and voice settings</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          AI Agent (Optional)
        </label>
        <select
          value={data.agentId}
          onChange={(e) => updateData('agentId', e.target.value)}
          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
        >
          <option value="">No agent (use default behavior)</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Workflow (Optional)
        </label>
        <select
          value={data.workflowId}
          onChange={(e) => updateData('workflowId', e.target.value)}
          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
        >
          <option value="">No workflow</option>
          {workflows.map((workflow) => (
            <option key={workflow.id} value={workflow.id}>
              {workflow.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Voice
          </label>
          <select
            value={data.voiceId}
            onChange={(e) => updateData('voiceId', e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
          >
            {VOICE_OPTIONS.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Language
          </label>
          <select
            value={data.languagePreference}
            onChange={(e) => updateData('languagePreference', e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
          >
            <option value="auto">Auto-detect</option>
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step 3: Call Flow
// ============================================================================

interface Step3Props {
  data: WizardData;
  updateData: (field: keyof WizardData, value: any) => void;
}

function Step3CallFlow({ data, updateData }: Step3Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Call Flow</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Configure greeting and call routing</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Greeting Message <span className="text-red-600">*</span>
        </label>
        <textarea
          value={data.greetingMessage}
          onChange={(e) => updateData('greetingMessage', e.target.value)}
          placeholder="Hello, thank you for calling. How can I help you?"
          rows={4}
          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          This message will be played when a caller connects
        </p>
      </div>

      <div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={data.useIvr}
            onChange={(e) => updateData('useIvr', e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-600"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Use IVR Menu (Press 1 for X, 2 for Y...)
          </span>
        </label>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 ml-8">
          If disabled, callers will speak directly with the AI agent after the greeting
        </p>
      </div>

      {data.useIvr && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            IVR Menu Builder coming soon! For now, you can enable this option and configure the menu later.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Step 4: Settings
// ============================================================================

interface Step4Props {
  data: WizardData;
  updateData: (field: keyof WizardData, value: any) => void;
}

function Step4Settings({ data, updateData }: Step4Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
          <Settings className="w-6 h-6 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Settings</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Configure recording, transcription, and business hours</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Max Call Duration (seconds)
        </label>
        <input
          type="number"
          value={data.maxCallDuration}
          onChange={(e) => updateData('maxCallDuration', parseInt(e.target.value) || 600)}
          min={60}
          max={3600}
          step={60}
          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {Math.floor(data.maxCallDuration / 60)} minutes
        </p>
      </div>

      <div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={data.recordCalls}
            onChange={(e) => updateData('recordCalls', e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-600"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Record all calls
          </span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Transcription Provider
        </label>
        <select
          value={data.transcriptionProvider}
          onChange={(e) => updateData('transcriptionProvider', e.target.value)}
          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
        >
          {TRANSCRIPTION_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          After Hours Message
        </label>
        <textarea
          value={data.afterHoursMessage}
          onChange={(e) => updateData('afterHoursMessage', e.target.value)}
          rows={3}
          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Fallback Transfer Number (Optional)
        </label>
        <input
          type="tel"
          value={data.transferNumber}
          onChange={(e) => updateData('transferNumber', e.target.value)}
          placeholder="+1234567890"
          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Transfer to this number if AI agent fails or is unavailable
        </p>
      </div>

      <div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={data.enabled}
            onChange={(e) => updateData('enabled', e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-600"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Enable this call point immediately
          </span>
        </label>
      </div>
    </div>
  );
}
