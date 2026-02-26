'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SetupStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'loading' | 'complete' | 'error';
}

export default function SetupPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: 1,
      title: 'Welcome',
      description: 'System requirements check',
      status: 'loading'
    },
    {
      id: 2,
      title: 'Database',
      description: 'Initialize database and run migrations',
      status: 'pending'
    },
    {
      id: 3,
      title: 'Admin Account',
      description: 'Create your admin account',
      status: 'pending'
    },
    {
      id: 4,
      title: 'Complete',
      description: 'Setup complete! Ready to launch',
      status: 'pending'
    }
  ]);

  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [systemCheck, setSystemCheck] = useState({
    node: false,
    python: false,
    ports: false,
    directories: false,
    pythonVersion: null as string | null,
    pythonSource: null as string | null,
    pythonSetupComplete: false
  });
  const [pythonInstalling, setPythonInstalling] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const runCheck = async () => {
      if (isMounted) {
        await checkSystemRequirements();
      }
    };

    runCheck();

    return () => {
      isMounted = false;
    };
  }, []);

  const checkSystemRequirements = async () => {
    console.log('[Setup] Starting system requirements check...');

    try {
      const response = await fetch('http://localhost:41522/api/setup/check', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Failed to check system requirements');
      }

      const data = await response.json();
      console.log('[Setup] System check response:', data);

      setSystemCheck({
        node: data.node || false,
        python: data.python || false,
        ports: data.ports || false,
        directories: data.directories || false,
        pythonVersion: data.pythonVersion || null,
        pythonSource: data.pythonSource || null,
        pythonSetupComplete: data.pythonSetupComplete || false
      });

      // Core checks: node, ports, directories are required. Python is optional (can install later).
      const coreChecksPass = data.node && data.ports && data.directories;
      console.log('[Setup] Core checks pass:', coreChecksPass, '| Python:', data.python ? `${data.pythonVersion} (${data.pythonSource})` : 'not found');

      updateStepStatus(0, coreChecksPass ? 'complete' : 'error');

      // Don't auto-advance - let user click button
      // if (allChecksPass) {
      //   setTimeout(() => {
      //     console.log('[Setup] Moving to step 1...');
      //     setCurrentStep(1);
      //   }, 1500);
      // }
    } catch (error) {
      console.error('[Setup] System check failed:', error);
      updateStepStatus(0, 'error');
      toast.error('Failed to check system requirements. Make sure backend is running on port 41522.');
    }
  };

  const updateStepStatus = (stepIndex: number, status: SetupStep['status']) => {
    setSteps(prev => prev.map((step, idx) =>
      idx === stepIndex ? { ...step, status } : step
    ));
  };

  const initializeDatabase = async () => {
    updateStepStatus(1, 'loading');

    try {
      const response = await fetch('http://localhost:41522/api/setup/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();

      updateStepStatus(1, 'complete');
      toast.success('Database initialized successfully!');

      setTimeout(() => setCurrentStep(2), 1000);
    } catch (error: any) {
      console.error('Database initialization failed:', error);
      updateStepStatus(1, 'error');
      toast.error(error.message || 'Failed to initialize database');
    }
  };

  const createAdminAccount = async () => {
    if (adminForm.password !== adminForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (adminForm.password.length < 12) {
      toast.error('Password must be at least 12 characters');
      return;
    }

    // Validate password strength
    if (!/[A-Z]/.test(adminForm.password)) {
      toast.error('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[a-z]/.test(adminForm.password)) {
      toast.error('Password must contain at least one lowercase letter');
      return;
    }

    if (!/[0-9]/.test(adminForm.password)) {
      toast.error('Password must contain at least one number');
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(adminForm.password)) {
      toast.error('Password must contain at least one special character');
      return;
    }

    updateStepStatus(2, 'loading');

    try {
      const response = await fetch('http://localhost:41522/api/setup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminForm.name,
          email: adminForm.email,
          password: adminForm.password
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create admin account');
      }

      updateStepStatus(2, 'complete');
      toast.success('Admin account created successfully!');

      setTimeout(() => {
        setCurrentStep(3);
        completeSetup();
      }, 1000);
    } catch (error: any) {
      console.error('Admin account creation failed:', error);
      updateStepStatus(2, 'error');
      toast.error(error.message || 'Failed to create admin account');
    }
  };

  const completeSetup = async () => {
    updateStepStatus(3, 'loading');

    try {
      const response = await fetch('http://localhost:41522/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to complete setup');
      }

      updateStepStatus(3, 'complete');
      toast.success('Setup completed! Redirecting to login...');

      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      console.error('Setup completion failed:', error);
      updateStepStatus(3, 'error');
      toast.error('Failed to complete setup');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Agent Player!</h2>
              <p className="text-gray-700 text-lg">Checking system requirements...</p>
            </div>

            <div className="space-y-4">
              <CheckItem
                label="Node.js Runtime"
                checked={systemCheck.node}
                loading={steps[0].status === 'loading'}
              />
              <CheckItem
                label={
                  systemCheck.pythonVersion
                    ? `Python ${systemCheck.pythonVersion} (${systemCheck.pythonSource === 'embedded' ? 'Portable' : systemCheck.pythonSource === 'venv' ? 'Virtual Env' : 'System'})`
                    : 'Python Environment'
                }
                checked={systemCheck.python}
                loading={steps[0].status === 'loading'}
              />
              {!systemCheck.python && steps[0].status !== 'loading' && (
                <div className="ml-8 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 mb-2">
                    Python is not configured. Run this command to set up a portable Python automatically:
                  </p>
                  <code className="block px-3 py-2 bg-amber-100 text-amber-900 rounded text-sm font-mono">
                    cd packages/backend && npm run setup:python
                  </code>
                  <button
                    onClick={async () => {
                      setPythonInstalling(true);
                      try {
                        const res = await fetch('http://localhost:41522/api/setup/python', { method: 'POST' });
                        if (res.ok) {
                          toast.success('Python environment installed!');
                          await checkSystemRequirements();
                        } else {
                          const err = await res.json().catch(() => ({}));
                          toast.error(err.message || 'Python setup failed. Try running the command manually.');
                        }
                      } catch {
                        toast.error('Could not reach backend. Run the command manually in terminal.');
                      }
                      setPythonInstalling(false);
                    }}
                    disabled={pythonInstalling}
                    className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm"
                  >
                    {pythonInstalling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Installing Python...
                      </>
                    ) : (
                      'Install Python Automatically'
                    )}
                  </button>
                </div>
              )}
              <CheckItem
                label="Ports Available (41521, 41522)"
                checked={systemCheck.ports}
                loading={steps[0].status === 'loading'}
              />
              <CheckItem
                label="Required Directories"
                checked={systemCheck.directories}
                loading={steps[0].status === 'loading'}
              />
            </div>

            {steps[0].status === 'complete' && (
              <div className="mt-6">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Continue to Database Setup →
                </button>
              </div>
            )}

            {steps[0].status === 'error' && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900">System Check Failed</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Please ensure the backend server is running on port 41522 and all requirements are met.
                    </p>
                    <button
                      onClick={checkSystemRequirements}
                      className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Retry Check
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Database Setup</h2>
              <p className="text-gray-700 text-lg">Initialize database and run migrations</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">What will happen:</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Create <code className="px-1 py-0.5 bg-blue-100 rounded">.data</code> directory structure</li>
                <li>• Initialize SQLite database (<code className="px-1 py-0.5 bg-blue-100 rounded">agent-player.db</code>)</li>
                <li>• Run all database migrations</li>
                <li>• Set up initial tables and indexes</li>
              </ul>
            </div>

            <button
              onClick={initializeDatabase}
              disabled={steps[1].status === 'loading'}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {steps[1].status === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Initializing Database...
                </>
              ) : (
                'Initialize Database'
              )}
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Admin Account</h2>
              <p className="text-gray-700 text-lg">Set up your administrator credentials</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                  placeholder="Min. 12 chars, uppercase, lowercase, number, special"
                  required
                />
                <p className="mt-1 text-xs text-gray-600">
                  Must include: uppercase, lowercase, number, and special character (!@#$%...)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={adminForm.confirmPassword}
                  onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>

            <button
              onClick={createAdminAccount}
              disabled={steps[2].status === 'loading' || !adminForm.name || !adminForm.email || !adminForm.password}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {steps[2].status === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Admin Account'
              )}
            </button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Setup Complete!</h2>
              <p className="text-gray-700 text-lg">Agent Player is ready to use</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 mb-3">What's next?</h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li>• Login with your admin credentials</li>
                <li>• Explore the dashboard and features</li>
                <li>• Create your first AI agent</li>
                <li>• Customize your 3D avatar</li>
                <li>• Install extensions from the marketplace</li>
              </ul>
            </div>

            {steps[3].status === 'loading' && (
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Redirecting to login...</span>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                        step.status === 'complete'
                          ? 'bg-green-600 border-green-600'
                          : step.status === 'loading'
                          ? 'bg-blue-600 border-blue-600 animate-pulse'
                          : step.status === 'error'
                          ? 'bg-red-600 border-red-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {step.status === 'complete' ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : step.status === 'loading' ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : step.status === 'error' ? (
                        <AlertCircle className="w-6 h-6 text-white" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-sm font-medium ${
                        currentStep === index ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 max-w-[120px]">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      step.status === 'complete' ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {renderStepContent()}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-600">
            Agent Player v1.3.0 • Built with Next.js & Claude AI
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ label, checked, loading }: { label: string; checked: boolean; loading: boolean }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
      {loading ? (
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      ) : checked ? (
        <CheckCircle className="w-5 h-5 text-green-600" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-600" />
      )}
      <span className={`font-medium ${checked ? 'text-gray-900' : 'text-red-900'}`}>
        {label}
      </span>
    </div>
  );
}
