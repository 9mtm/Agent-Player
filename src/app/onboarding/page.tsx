'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { onboardingAPI, type OnboardingState, type OnboardingStepId } from '@/lib/backend';
import { DEFAULT_AFTER_LOGIN_PATH, HOME_CHAT_PATH } from '@/lib/auth/post-login';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User,
  Cpu,
  MessageSquare,
  Puzzle,
  PartyPopper
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Welcome', icon: Sparkles },
  { id: 2, title: 'Profile', icon: User },
  { id: 3, title: 'AI Provider', icon: Cpu },
  { id: 4, title: 'Channels', icon: MessageSquare },
  { id: 5, title: 'Skills', icon: Puzzle },
  { id: 6, title: 'Complete', icon: PartyPopper }
];

// Providers the backend settings can apply (F-05). Local Ollama is the default (M-03).
const AI_PROVIDERS = [
  { id: 'ollama', name: 'Ollama (Local)', recommended: true, defaultModel: 'qwen3.8:27b' },
  { id: 'anthropic', name: 'Anthropic Claude', recommended: false, defaultModel: 'claude-sonnet-4-5-20250929' },
  { id: 'openai', name: 'OpenAI GPT', recommended: false, defaultModel: 'gpt-4' }
] as const;

type ProviderId = (typeof AI_PROVIDERS)[number]['id'];

// D-LANG: the 12 UI languages.
const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'ar', name: 'العربية (Arabic)' },
  { id: 'de', name: 'Deutsch (German)' },
  { id: 'fr', name: 'Français (French)' },
  { id: 'es', name: 'Español (Spanish)' },
  { id: 'zh', name: '中文 (Chinese, Simplified)' },
  { id: 'ja', name: '日本語 (Japanese)' },
  { id: 'ko', name: '한국어 (Korean)' },
  { id: 'pt-BR', name: 'Português (Brazil)' },
  { id: 'ru', name: 'Русский (Russian)' },
  { id: 'tr', name: 'Türkçe (Turkish)' },
  { id: 'hi', name: 'हिन्दी (Hindi)' }
];

// Which backend step each wizard page saves (1 = Welcome, 6 = Complete save nothing).
const STEP_SAVES: Record<number, OnboardingStepId | null> = {
  1: null, 2: 'profile', 3: 'provider', 4: 'channels', 5: 'skills', 6: null
};

const CHANNELS = [
  { id: 'web', name: 'Web Chat', description: 'Built-in web interface', icon: '🌐' },
  { id: 'whatsapp', name: 'WhatsApp', description: 'Most popular messenger', icon: '📱' },
  { id: 'telegram', name: 'Telegram', description: 'Easy setup bot', icon: '✈️' },
  { id: 'discord', name: 'Discord', description: 'For communities', icon: '🎮' }
];

const SKILLS = [
  { id: 'weather', name: 'Weather', description: 'Get weather forecasts' },
  { id: 'github', name: 'GitHub', description: 'Manage repositories & PRs' },
  { id: 'web-search', name: 'Web Search', description: 'Search the internet' },
  { id: 'note-taking', name: 'Note Taking', description: 'Save and recall notes' },
  { id: 'calculator', name: 'Calculator', description: 'Math calculations' }
];

export default function OnboardingWizard() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form data
  const [formData, setFormData] = useState<{
    userName: string;
    language: string;
    aiProvider: ProviderId;
    aiModel: string;
    selectedChannels: string[];
    selectedSkills: string[];
  }>({
    userName: '',
    language: 'en',
    aiProvider: 'ollama',
    aiModel: '',
    selectedChannels: ['web'],
    selectedSkills: ['weather', 'web-search']
  });
  // A new API key typed on the provider step. Sent once, never kept after saving.
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    setLoading(true);
    try {
      const data = await onboardingAPI.getState();
      setState(data);

      // If already completed, go home (main-agent chat)
      if (data.completed) {
        router.push(HOME_CHAT_PATH);
        return;
      }

      // Resume from saved state
      if (data.data) {
        setFormData({
          userName: data.data.userName || '',
          language: data.data.language || 'en',
          aiProvider: data.data.aiProvider || 'ollama',
          aiModel: data.data.aiModel || '',
          selectedChannels: data.data.selectedChannels || ['web'],
          selectedSkills: data.data.selectedSkills || ['weather', 'web-search']
        });
        setCurrentStep(data.currentStep || 1);
      }
    } catch (err: any) {
      // Owner only: anyone else (or a signed-out user) leaves the wizard.
      console.error('Failed to load onboarding state');
      router.push(DEFAULT_AFTER_LOGIN_PATH);
      return;
    } finally {
      setLoading(false);
    }
  };

  const stepData = (step: OnboardingStepId): Record<string, unknown> => {
    switch (step) {
      case 'profile':
        return { userName: formData.userName, language: formData.language };
      case 'provider':
        return {
          aiProvider: formData.aiProvider,
          aiModel: formData.aiModel,
          ...(formData.aiProvider !== 'ollama' && apiKey ? { apiKey } : {})
        };
      case 'channels':
        return { selectedChannels: formData.selectedChannels };
      case 'skills':
        return { selectedSkills: formData.selectedSkills };
    }
  };

  /** Save the current page's answers (validated by the backend); false on error. */
  const saveProgress = async (nextStep?: number): Promise<boolean> => {
    setSaving(true);
    try {
      const step = STEP_SAVES[currentStep] ?? null;
      const saved = await onboardingAPI.saveStep(step, step ? stepData(step) : null, nextStep);
      setState(saved);
      if (step === 'provider') setApiKey('');
      return true;
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (currentStep >= STEPS.length) return;
    if (await saveProgress(currentStep + 1)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await onboardingAPI.complete(true);
      router.push(HOME_CHAT_PATH);
    } catch (err: any) {
      toast.error(`Failed to skip: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await onboardingAPI.complete(false);
      router.push(HOME_CHAT_PATH);
    } catch (err: any) {
      toast.error(`Failed to complete: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (channelId: string) => {
    setFormData({
      ...formData,
      selectedChannels: formData.selectedChannels.includes(channelId)
        ? formData.selectedChannels.filter(id => id !== channelId)
        : [...formData.selectedChannels, channelId]
    });
  };

  const toggleSkill = (skillId: string) => {
    setFormData({
      ...formData,
      selectedSkills: formData.selectedSkills.includes(skillId)
        ? formData.selectedSkills.filter(id => id !== skillId)
        : [...formData.selectedSkills, skillId]
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Sparkles className="w-12 h-12 animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      isActive
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`w-16 h-1 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              Step {currentStep} of {STEPS.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div className="space-y-6 text-center py-8">
                <Sparkles className="w-20 h-20 mx-auto text-blue-500" />
                <div>
                  <h2 className="text-3xl font-bold mb-2">Welcome to Agent Player!</h2>
                  <p className="text-muted-foreground text-lg">
                    Let's set up your AI assistant in just a few steps
                  </p>
                </div>
                <Alert>
                  <AlertDescription>
                    This wizard will help you configure your agent, connect channels,
                    and install skills. You can change everything later in settings.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Step 2: User Profile */}
            {currentStep === 2 && (
              <div className="space-y-6 py-4">
                <div>
                  <Label>What should we call you? *</Label>
                  <Input
                    value={formData.userName}
                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                    placeholder="Your name"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Preferred Language</Label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full p-2 border rounded-md mt-2"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.id}>{lang.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Step 3: AI Provider */}
            {currentStep === 3 && (
              <div className="space-y-6 py-4">
                <p className="text-muted-foreground">
                  Choose your AI provider. You can change this later.
                </p>

                <div className="space-y-3">
                  {AI_PROVIDERS.map((provider) => (
                    <div
                      key={provider.id}
                      onClick={() => setFormData({ ...formData, aiProvider: provider.id, aiModel: '' })}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.aiProvider === provider.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{provider.name}</p>
                          {provider.recommended && (
                            <Badge variant="default" className="mt-1">Recommended</Badge>
                          )}
                        </div>
                        {formData.aiProvider === provider.id && (
                          <CheckCircle2 className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <Label>Model</Label>
                  <Input
                    value={formData.aiModel}
                    onChange={(e) => setFormData({ ...formData, aiModel: e.target.value })}
                    placeholder={AI_PROVIDERS.find(p => p.id === formData.aiProvider)?.defaultModel}
                    className="mt-2"
                  />
                </div>

                {formData.aiProvider === 'ollama' ? (
                  <Alert>
                    <AlertDescription className="text-sm">
                      💡 Runs on this computer through Ollama at http://127.0.0.1:11434. No API key needed.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div>
                    <Label>API key (optional)</Label>
                    <Input
                      type="password"
                      autoComplete="off"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={
                        state?.data.aiProvider === formData.aiProvider && state?.data.apiKeyMasked
                          ? `Saved: ${state.data.apiKeyMasked}`
                          : 'Paste your API key'
                      }
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Stored encrypted. You can also add or change it later in Settings.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Channels */}
            {currentStep === 4 && (
              <div className="space-y-6 py-4">
                <p className="text-muted-foreground">
                  Select the channels you plan to use. Nothing is connected now; set them up later under Channels.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CHANNELS.map((channel) => (
                    <div
                      key={channel.id}
                      onClick={() => toggleChannel(channel.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.selectedChannels.includes(channel.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            <span className="text-2xl">{channel.icon}</span>
                            {channel.name}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {channel.description}
                          </p>
                        </div>
                        {formData.selectedChannels.includes(channel.id) && (
                          <CheckCircle2 className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Skills */}
            {currentStep === 5 && (
              <div className="space-y-6 py-4">
                <p className="text-muted-foreground">
                  Select the skills you are interested in. Nothing is installed now; add them later under Skills.
                </p>

                <div className="space-y-2">
                  {SKILLS.map((skill) => (
                    <div
                      key={skill.id}
                      onClick={() => toggleSkill(skill.id)}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.selectedSkills.includes(skill.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{skill.name}</p>
                          <p className="text-sm text-muted-foreground">{skill.description}</p>
                        </div>
                        {formData.selectedSkills.includes(skill.id) && (
                          <CheckCircle2 className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6: Complete */}
            {currentStep === 6 && (
              <div className="space-y-6 text-center py-8">
                <PartyPopper className="w-20 h-20 mx-auto text-green-500" />
                <div>
                  <h2 className="text-3xl font-bold mb-2">You're All Set!</h2>
                  <p className="text-muted-foreground text-lg">
                    Your agent is ready to use
                  </p>
                </div>

                <Card className="text-left">
                  <CardHeader>
                    <CardTitle className="text-lg">Configuration Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-semibold">{formData.userName || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Language:</span>
                      <span className="font-semibold">{LANGUAGES.find(l => l.id === formData.language)?.name ?? formData.language}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AI Provider:</span>
                      <span className="font-semibold">
                        {AI_PROVIDERS.find(p => p.id === formData.aiProvider)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Channels:</span>
                      <span className="font-semibold">{formData.selectedChannels.length} selected</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Skills:</span>
                      <span className="font-semibold">{formData.selectedSkills.length} selected</span>
                    </div>
                  </CardContent>
                </Card>

                <Alert>
                  <AlertDescription>
                    💡 Quick tip: Visit the Skills marketplace to add more capabilities,
                    and create workflows to automate tasks!
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <div className="flex gap-2">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  disabled={currentStep === 1 || saving}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                {currentStep < STEPS.length && (
                  <Button onClick={handleSkip} variant="ghost" disabled={saving}>
                    Skip setup
                  </Button>
                )}
              </div>

              {currentStep < STEPS.length ? (
                <Button onClick={handleNext} disabled={saving}>
                  {saving ? 'Saving...' : 'Next'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleComplete} disabled={saving}>
                  {saving ? 'Completing...' : 'Complete Setup'}
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
