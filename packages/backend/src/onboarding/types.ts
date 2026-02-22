/**
 * Onboarding System Types
 *
 * Interactive setup wizard for first-time users
 */

export interface OnboardingState {
  completed: boolean;
  currentStep: number;
  totalSteps: number;

  // User Profile
  userProfile?: {
    name: string;
    language: 'en' | 'ar' | 'auto';
  };

  // AI Provider
  aiProvider?: {
    provider: 'anthropic' | 'openai' | 'google' | 'ollama';
    apiKey?: string;
    configured: boolean;
  };

  // Channels
  channels?: {
    selected: string[];
    connected: string[];
  };

  // Skills
  skills?: {
    installed: string[];
  };

  // Timestamps
  startedAt?: Date;
  completedAt?: Date;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface WizardOptions {
  skipable: boolean;
  resumable: boolean;
  language: 'en' | 'ar';
}

export interface IOnboardingWizard {
  start(): Promise<void>;
  resume(): Promise<void>;
  skip(): Promise<void>;
  getCurrentStep(): OnboardingStep | null;
  getProgress(): number;
  isCompleted(): boolean;
}
