'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { onboardingAPI, type OnboardingState } from '@/lib/backend';
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

const AI_PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic Claude', recommended: true },
  { id: 'openai', name: 'OpenAI GPT', recommended: false },
  { id: 'google', name: 'Google Gemini', recommended: false },
  { id: 'ollama', name: 'Ollama (Local)', recommended: false }
];

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
  const [formData, setFormData] = useState({
    userName: '',
    language: 'en',
    aiProvider: 'anthropic',
    aiModel: '',
    selectedChannels: ['web'],
    selectedSkills: ['weather', 'web-search']
  });

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    setLoading(true);
    try {
      const data = await onboardingAPI.getState();
      setState(data);

      // If already completed, redirect to dashboard
      if (data.completed) {
        router.push('/dashboard');
        return;
      }

      // Resume from saved state
      if (data.data) {
        setFormData({
          userName: data.data.userName || '',
          language: data.data.language || 'en',
          aiProvider: data.data.aiProvider || 'anthropic',
          aiModel: data.data.aiModel || '',
          selectedChannels: data.data.selectedChannels || ['web'],
          selectedSkills: data.data.selectedSkills || ['weather', 'web-search']
        });
        setCurrentStep(data.currentStep || 1);
      }
    } catch (err: any) {
      console.error('Failed to load state:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async () => {
    setSaving(true);
    try {
      await onboardingAPI.updateState(formData);
    } catch (err: any) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    await saveProgress();

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
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
      await saveProgress();
      await onboardingAPI.complete();
      router.push('/dashboard');
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
                    <option value="en">English</option>
                    <option value="ar">العربية (Arabic)</option>
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
                      onClick={() => setFormData({ ...formData, aiProvider: provider.id })}
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

                <Alert>
                  <AlertDescription className="text-sm">
                    💡 You'll need an API key for {AI_PROVIDERS.find(p => p.id === formData.aiProvider)?.name}.
                    You can add it later in Settings → Credentials.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Step 4: Channels */}
            {currentStep === 4 && (
              <div className="space-y-6 py-4">
                <p className="text-muted-foreground">
                  Select channels to connect (you can add more later)
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
                  Select skills to install (you can add more from the marketplace later)
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
                      <span className="font-semibold">{formData.language === 'ar' ? 'العربية' : 'English'}</span>
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
              <Button
                onClick={handleBack}
                variant="outline"
                disabled={currentStep === 1 || saving}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

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
