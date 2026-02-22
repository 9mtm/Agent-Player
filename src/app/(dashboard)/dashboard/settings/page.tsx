'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { extensionsAPI, Extension, ChannelConfig, SetupGuide } from '@/lib/backend/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Settings,
  Puzzle,
  Radio,
  Paintbrush,
  Box,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  User,
  Bell,
  Shield,
  Database,
  Eye,
  EyeOff,
  Bot,
  Save,
  Sparkles,
  PlayCircle,
  ExternalLink,
  Lightbulb,
  TriangleAlert,
  ChevronRight,
  BookOpen,
  Search,
  Store,
  Download,
  Package,
  Zap,
  Terminal,
  Plus,
  FileText,
  Code,
  FolderOpen,
  Copy,
  Wand2,
  Info,
  Trash2,
  MoreVertical,
  Edit3,
  ExternalLink as ExternalLinkIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { skillsClient, type Skill } from '@/lib/skills/client';
import { cn } from '@/lib/utils';
import { config } from '@/lib/config';
import { useDeveloperMode } from '@/contexts/developer-context';

const BACKEND_URL = config.backendUrl;

// Tab definitions
const tabs = [
  { id: 'agent', label: 'Agent', icon: Bot },
  { id: 'skills', label: 'Skills', icon: Zap },
  { id: 'extensions', label: 'Extensions', icon: Puzzle },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'developer', label: 'Developer', icon: Code },
];

// Extension type icons
const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  channel: Radio,
  app: Box,
  theme: Paintbrush,
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'enabled':
    case 'installed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
          <CheckCircle2 className="h-3 w-3" />
          {status === 'enabled' ? 'Enabled' : 'Installed'}
        </span>
      );
    case 'disabled':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-500">
          <XCircle className="h-3 w-3" />
          Disabled
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
          <AlertCircle className="h-3 w-3" />
          Error
        </span>
      );
    default:
      return null;
  }
}

// Setup Wizard Component - Stepper with navigation
function SetupWizard({
  extension,
  configValues,
  setConfigValues,
  showSecrets,
  toggleSecret,
  onSave,
  isSaving,
  onClose,
}: {
  extension: Extension;
  configValues: Record<string, string | number | boolean>;
  setConfigValues: React.Dispatch<React.SetStateAction<Record<string, string | number | boolean>>>;
  showSecrets: Record<string, boolean>;
  toggleSecret: (key: string) => void;
  onSave: () => void;
  isSaving: boolean;
  onClose: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);

  const guide = extension.setupGuide;
  const config = extension.config || {};
  const configFields = Object.entries(config);
  const guideSteps = guide?.steps || [];

  // Total steps = guide steps + 1 config step at the end
  const totalSteps = guideSteps.length + 1;
  const isConfigStep = currentStep >= guideSteps.length;
  const currentGuideStep = guideSteps[currentStep];

  // Check if a config field is filled
  const isFieldFilled = (key: string, field: typeof config[string]) => {
    const value = configValues[key];
    if (field.type === 'boolean') return true;
    if (field.required) {
      return value !== undefined && value !== '';
    }
    return true;
  };

  // Check if all required fields are filled
  const allRequiredFilled = configFields.every(([key, field]) => isFieldFilled(key, field));

  // Calculate progress percentage based on current step
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);

  // Navigation
  const canGoBack = currentStep > 0;
  const canGoNext = currentStep < totalSteps - 1;
  const isLastStep = currentStep === totalSteps - 1;

  const handleNext = () => {
    if (canGoNext) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (canGoBack) setCurrentStep(prev => prev - 1);
  };

  return (
    <div className="flex flex-col h-[70vh]">
      {/* Progress Header with Step Indicators */}
      <div className="flex-shrink-0 pb-4 border-b mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className={cn(
            "text-sm font-medium",
            progressPercent === 100 ? "text-green-500" : "text-muted-foreground"
          )}>
            {progressPercent}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
          <div
            className={cn(
              "h-full transition-all duration-500",
              isLastStep ? "bg-green-500" : "bg-primary"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const isCompleted = i < currentStep;
            const isCurrent = i === currentStep;
            const stepLabel = i < guideSteps.length ? guideSteps[i].title : 'Configuration';

            return (
              <div key={i} className="flex flex-col items-center flex-1">
                <button
                  onClick={() => setCurrentStep(i)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all mb-1",
                    isCompleted ? "bg-green-500 text-white" :
                    isCurrent ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                    "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                </button>
                <span className={cn(
                  "text-xs text-center max-w-[80px] truncate",
                  isCurrent ? "text-primary font-medium" : "text-muted-foreground"
                )}>
                  {stepLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content - Split View */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* LEFT SIDE - Current Step Instructions */}
        <div className="flex-1 overflow-y-auto pr-4">
          {isConfigStep ? (
            // Configuration Step
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Configuration</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Fill in the required settings to complete the setup.
              </p>

              {configFields.length === 0 ? (
                <div className="py-8 text-center rounded-lg border-2 border-dashed border-green-500/50 bg-green-500/5">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="font-medium text-green-600">Ready to Enable!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No configuration required. Click "Enable" to activate.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {configFields.map(([key, field]) => {
                    const value = configValues[key];
                    const isEmpty = value === undefined || value === '';
                    const isFilled = !isEmpty || field.type === 'boolean';

                    return (
                      <div
                        key={key}
                        className={cn(
                          "space-y-2 p-4 rounded-lg border-2 transition-all duration-300",
                          isFilled ? "border-green-500/50 bg-green-500/5" :
                          field.required ? "border-yellow-500/50 bg-yellow-500/5" : "border-border bg-card"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium flex items-center gap-2">
                            {isFilled ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                            )}
                            {field.label || key}
                          </label>
                          {field.required && (
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              isEmpty ? "bg-yellow-500/20 text-yellow-600" : "bg-green-500/20 text-green-600"
                            )}>
                              {isEmpty ? 'Required' : 'Done'}
                            </span>
                          )}
                        </div>

                        {field.description && (
                          <p className="text-xs text-muted-foreground ml-6">{field.description}</p>
                        )}

                        <div className="ml-6">
                          {field.type === 'boolean' ? (
                            <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50">
                              <input
                                type="checkbox"
                                checked={Boolean(configValues[key])}
                                onChange={(e) => setConfigValues(prev => ({ ...prev, [key]: e.target.checked }))}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm">{configValues[key] ? 'Enabled' : 'Disabled'}</span>
                            </label>
                          ) : field.type === 'secret' ? (
                            <div className="relative">
                              <Input
                                type={showSecrets[key] ? 'text' : 'password'}
                                value={String(configValues[key] || '')}
                                onChange={(e) => setConfigValues(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder={field.placeholder || `Enter ${field.label || key}`}
                                required={field.required}
                                className="pr-10 font-mono text-sm h-11"
                              />
                              <button
                                type="button"
                                onClick={() => toggleSecret(key)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showSecrets[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          ) : (
                            <Input
                              type={field.type === 'number' ? 'number' : 'text'}
                              value={String(configValues[key] || '')}
                              onChange={(e) => setConfigValues(prev => ({
                                ...prev,
                                [key]: field.type === 'number' ? Number(e.target.value) : e.target.value
                              }))}
                              placeholder={field.placeholder || `Enter ${field.label || key}`}
                              required={field.required}
                              className="h-11"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // Guide Step
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">{currentStep + 1}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{currentGuideStep?.title}</h3>
                  <p className="text-xs text-muted-foreground">Step {currentStep + 1} of {totalSteps}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm leading-relaxed">
                  {currentGuideStep?.description}
                </p>
              </div>

              {/* Step Link */}
              {currentGuideStep?.link && (
                <a
                  href={currentGuideStep.link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <ExternalLink className="h-5 w-5 text-primary" />
                  <span className="font-medium text-primary">{currentGuideStep.link.label}</span>
                </a>
              )}

              {/* Step Image */}
              {currentGuideStep?.image && (
                <div className="rounded-lg overflow-hidden border">
                  <img src={currentGuideStep.image} alt={currentGuideStep.title} className="w-full" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px bg-border" />

        {/* RIGHT SIDE - Video & Tips */}
        <div className="w-[320px] flex-shrink-0 overflow-y-auto pl-4">
          <div className="space-y-4">
            {/* Video Tutorial */}
            {guide?.videoUrl && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-primary" />
                  Video Tutorial
                </p>
                <div className="relative aspect-video rounded-lg overflow-hidden border">
                  <iframe
                    src={guide.videoUrl.replace('watch?v=', 'embed/')}
                    title="Setup Tutorial"
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* All Steps Overview */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                All Steps
              </p>
              <div className="space-y-2">
                {guideSteps.map((step, index) => {
                  const isCompleted = index < currentStep;
                  const isCurrent = index === currentStep;

                  return (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all text-sm",
                        isCompleted ? "bg-green-500/10 text-green-600" :
                        isCurrent ? "bg-primary/10 text-primary" :
                        "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        isCompleted ? "bg-green-500 text-white" :
                        isCurrent ? "bg-primary text-primary-foreground" :
                        "bg-muted"
                      )}>
                        {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                      <span className="truncate">{step.title}</span>
                    </button>
                  );
                })}
                {/* Config step */}
                <button
                  onClick={() => setCurrentStep(guideSteps.length)}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all text-sm",
                    isConfigStep ? "bg-primary/10 text-primary" :
                    "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    isConfigStep ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {guideSteps.length + 1}
                  </span>
                  <span className="truncate">Configuration</span>
                </button>
              </div>
            </div>

            {/* Tips */}
            {guide?.tips && guide.tips.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mb-2">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Tips
                </p>
                <ul className="space-y-1">
                  {guide.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-blue-600/80 dark:text-blue-400/80">• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {guide?.warnings && guide.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5 mb-2">
                  <TriangleAlert className="h-3.5 w-3.5" />
                  Important
                </p>
                <ul className="space-y-1">
                  {guide.warnings.map((warning, i) => (
                    <li key={i} className="text-xs text-yellow-600/80 dark:text-yellow-400/80">• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex-shrink-0 flex items-center justify-between pt-4 mt-4 border-t">
        <Button
          variant="outline"
          onClick={canGoBack ? handleBack : onClose}
          className="gap-2"
        >
          {canGoBack ? (
            <>
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back
            </>
          ) : (
            'Cancel'
          )}
        </Button>

        <div className="flex items-center gap-2">
          {!isLastStep ? (
            <Button onClick={handleNext} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={onSave}
              disabled={isSaving || !allRequiredFilled}
              className={cn(
                "gap-2 min-w-[140px] transition-all",
                allRequiredFilled && "bg-green-600 hover:bg-green-700"
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {allRequiredFilled ? 'Enable' : 'Fill Required'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Configuration Dialog Component - Now uses Setup Wizard
function ConfigDialog({
  extension,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  extension: Extension | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: Record<string, unknown>) => void;
  isSaving: boolean;
}) {
  const [configValues, setConfigValues] = useState<Record<string, string | number | boolean>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Reset form when extension changes
  useEffect(() => {
    if (extension?.config) {
      const defaults: Record<string, string | number | boolean> = {};
      for (const [key, field] of Object.entries(extension.config)) {
        defaults[key] = field.default ?? '';
      }
      setConfigValues(defaults);
      setShowSecrets({});
    }
  }, [extension]);

  if (!extension) return null;

  const handleSave = () => {
    onSave(configValues);
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-5xl w-[95vw] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Setup {extension.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <SetupWizard
            extension={extension}
            configValues={configValues}
            setConfigValues={setConfigValues}
            showSecrets={showSecrets}
            toggleSecret={toggleSecret}
            onSave={handleSave}
            isSaving={isSaving}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExtensionCard({
  extension,
  onEnable,
  onDisable,
  onConfigure,
  isLoading,
}: {
  extension: Extension;
  onEnable: (ext: Extension) => void;
  onDisable: (id: string) => void;
  onConfigure: (ext: Extension) => void;
  isLoading: boolean;
}) {
  const TypeIcon = typeIcons[extension.type] || Box;
  const isEnabled = extension.status === 'enabled';
  const hasError = extension.status === 'error';
  const hasConfig = extension.config && Object.keys(extension.config).length > 0;

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg",
        extension.type === 'channel' && "bg-blue-500/10 text-blue-500",
        extension.type === 'app' && "bg-purple-500/10 text-purple-500",
        extension.type === 'theme' && "bg-pink-500/10 text-pink-500",
      )}>
        <TypeIcon className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{extension.name}</h4>
          <StatusBadge status={extension.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {extension.description || `${extension.type} extension`}
        </p>
        {hasError && extension.error && (
          <p className="text-xs text-red-500">{extension.error}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>v{extension.version}</span>
          {extension.author && (
            <>
              <span>•</span>
              <span>by {extension.author}</span>
            </>
          )}
          <span>•</span>
          <span className="capitalize">{extension.type}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Enabled or Error: Show Settings + Disable */}
        {(isEnabled || hasError) ? (
          <>
            {hasConfig && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onConfigure(extension)}
                disabled={isLoading}
                className="gap-1.5"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            )}
            <Button
              variant={hasError ? "destructive" : "outline"}
              size="sm"
              onClick={() => onDisable(extension.id)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Disable'
              )}
            </Button>
          </>
        ) : (
          /* Disabled: Show Enable button only */
          <Button
            size="sm"
            onClick={() => onEnable(extension)}
            disabled={isLoading}
            className="gap-1.5"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Enable'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Marketplace extensions - will be loaded from API in the future
// For now, marketplace only shows installed extensions from the file system
const marketplaceExtensions: Extension[] = [];

// Marketplace Card Component - Shows all extensions with appropriate actions
function MarketplaceCard({
  extension,
  installedExtension,
  onInstall,
  onEnable,
  onDisable,
  onConfigure,
  isLoading,
}: {
  extension: Extension;
  installedExtension: Extension | null; // The installed version if exists
  onInstall: (ext: Extension) => void;
  onEnable: (ext: Extension) => void;
  onDisable: (id: string) => void;
  onConfigure: (ext: Extension) => void;
  isLoading: boolean;
}) {
  const TypeIcon = typeIcons[extension.type] || Box;
  const isInstalled = !!installedExtension;
  const isEnabled = installedExtension?.status === 'enabled';
  const hasError = installedExtension?.status === 'error';
  const hasConfig = installedExtension?.config && Object.keys(installedExtension.config).length > 0;

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg",
        extension.type === 'channel' && "bg-blue-500/10 text-blue-500",
        extension.type === 'app' && "bg-purple-500/10 text-purple-500",
        extension.type === 'theme' && "bg-pink-500/10 text-pink-500",
      )}>
        <TypeIcon className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{extension.name}</h4>
          {/* Only show badge for enabled or error states, not disabled */}
          {isInstalled && (isEnabled || hasError) && (
            <StatusBadge status={installedExtension.status} />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {extension.description}
        </p>
        {hasError && installedExtension?.error && (
          <p className="text-xs text-red-500">{installedExtension.error}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>v{extension.version}</span>
          {extension.author && (
            <>
              <span>•</span>
              <span>by {extension.author}</span>
            </>
          )}
          <span>•</span>
          <span className="capitalize">{extension.type}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isInstalled ? (
          // Installed: Show same controls as My Extensions
          (isEnabled || hasError) ? (
            <>
              {hasConfig && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfigure(installedExtension)}
                  disabled={isLoading}
                  className="gap-1.5"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              )}
              <Button
                variant={hasError ? "destructive" : "outline"}
                size="sm"
                onClick={() => onDisable(installedExtension.id)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Disable'
                )}
              </Button>
            </>
          ) : (
            // Disabled: Show Install button (to add to My Extensions)
            <Button
              size="sm"
              onClick={() => onEnable(installedExtension)}
              disabled={isLoading}
              className="gap-1.5"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Install
                </>
              )}
            </Button>
          )
        ) : (
          // Not installed: Show Install button
          <Button
            size="sm"
            onClick={() => onInstall(extension)}
            disabled={isLoading}
            className="gap-1.5"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Download className="h-4 w-4" />
                Install
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function ExtensionsTab() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'channel' | 'app' | 'theme'>('all');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [source, setSource] = useState<'installed' | 'marketplace'>('installed');

  // Config dialog state
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<Extension | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const loadExtensions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[Extensions] Loading extensions...');
      const data = await extensionsAPI.list();
      console.log('[Extensions] Loaded:', data);
      setExtensions(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load extensions';
      console.error('[Extensions] Load error:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExtensions();
  }, []);

  const handleEnable = async (ext: Extension) => {
    const hasConfig = ext.config && Object.keys(ext.config).length > 0;

    // If extension has config requirements, show config dialog first
    if (hasConfig) {
      setSelectedExtension(ext);
      setConfigDialogOpen(true);
      return;
    }

    // No config required, enable directly
    try {
      setActionLoading(ext.id);
      setError(null);
      console.log('[Extensions] Enabling:', ext.id);
      const result = await extensionsAPI.enable(ext.id);
      console.log('[Extensions] Enable result:', result);
      await loadExtensions();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to enable extension';
      console.error('[Extensions] Enable error:', err);
      setError(errorMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisable = async (id: string) => {
    try {
      setActionLoading(id);
      setError(null);
      console.log('[Extensions] Disabling:', id);
      const result = await extensionsAPI.disable(id);
      console.log('[Extensions] Disable result:', result);
      await loadExtensions();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to disable extension';
      console.error('[Extensions] Disable error:', err);
      setError(errorMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfigure = (ext: Extension) => {
    setSelectedExtension(ext);
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async (config: Record<string, unknown>) => {
    if (!selectedExtension) return;

    try {
      setIsSavingConfig(true);
      setError(null);
      console.log('[Extensions] Saving config for:', selectedExtension.id, config);
      // Re-enable with new config
      await extensionsAPI.enable(selectedExtension.id, config);
      await loadExtensions();
      setConfigDialogOpen(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save config';
      console.error('[Extensions] Save config error:', err);
      setError(errorMsg);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleInstall = async (ext: Extension) => {
    // TODO: Implement actual installation
    setActionLoading(ext.id);
    // Simulate installation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setActionLoading(null);
    // Show coming soon message
    setError(`Installation of "${ext.name}" coming soon! For now, manually add extensions to the extensions folder.`);
  };

  // Get installed extension IDs
  const installedIds = new Set(extensions.map(e => e.id));

  // Filter extensions based on search query and type
  const filterExtensions = (exts: Extension[]) => {
    return exts.filter(ext => {
      const matchesType = filter === 'all' || ext.type === filter;
      const matchesSearch = searchQuery === '' ||
        ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ext.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  };

  // My Extensions: Only show enabled or error extensions
  const activeExtensions = extensions.filter(e => e.status === 'enabled' || e.status === 'error');
  const filteredInstalled = filterExtensions(activeExtensions);

  // Combine installed + marketplace (avoid duplicates)
  const allMarketplaceExtensions = [
    ...extensions, // Installed first (all states)
    ...marketplaceExtensions.filter(mp => !installedIds.has(mp.id)), // Then non-installed marketplace
  ];
  const filteredMarketplace = filterExtensions(allMarketplaceExtensions);

  // Counts for tabs
  const installedCounts = {
    all: activeExtensions.length,
    channel: activeExtensions.filter(e => e.type === 'channel').length,
    app: activeExtensions.filter(e => e.type === 'app').length,
    theme: activeExtensions.filter(e => e.type === 'theme').length,
  };

  const marketplaceCounts = {
    all: allMarketplaceExtensions.length,
    channel: allMarketplaceExtensions.filter(e => e.type === 'channel').length,
    app: allMarketplaceExtensions.filter(e => e.type === 'app').length,
    theme: allMarketplaceExtensions.filter(e => e.type === 'theme').length,
  };

  const counts = source === 'installed' ? installedCounts : marketplaceCounts;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Extensions</h2>
          <p className="text-sm text-muted-foreground">
            Manage installed extensions and browse marketplace
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadExtensions}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Search Box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search extensions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Source Tabs: Installed vs Marketplace */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setSource('installed')}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            source === 'installed'
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Package className="h-4 w-4" />
          My Extensions
          <span className="ml-1 rounded-full bg-background/20 px-2 py-0.5 text-xs">
            {activeExtensions.length}
          </span>
        </button>
        <button
          onClick={() => setSource('marketplace')}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            source === 'marketplace'
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Store className="h-4 w-4" />
          Marketplace
          <span className="ml-1 rounded-full bg-background/20 px-2 py-0.5 text-xs">
            {allMarketplaceExtensions.length}
          </span>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-red-500/10 p-4 text-red-500">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500/70 hover:text-red-500"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Type Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'channel', 'app', 'theme'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filter === type
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}s
            <span className="ml-1.5 text-xs opacity-70">({counts[type]})</span>
          </button>
        ))}
      </div>

      {/* Extensions list */}
      {source === 'installed' ? (
        // My Extensions
        filteredInstalled.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Puzzle className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-medium">
              {searchQuery ? 'No matching extensions' : 'No extensions installed'}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery
                ? `No extensions match "${searchQuery}"`
                : 'Browse the marketplace to find extensions'
              }
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setSource('marketplace')}
              >
                <Store className="mr-2 h-4 w-4" />
                Browse Marketplace
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInstalled.map((ext) => (
              <ExtensionCard
                key={ext.id}
                extension={ext}
                onEnable={handleEnable}
                onDisable={handleDisable}
                onConfigure={handleConfigure}
                isLoading={actionLoading === ext.id}
              />
            ))}
          </div>
        )
      ) : (
        // Marketplace
        filteredMarketplace.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Store className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-medium">No extensions found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery
                ? `No extensions match "${searchQuery}"`
                : 'No extensions available in this category'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMarketplace.map((ext) => {
              // Check if this extension is installed
              const installedExt = installedIds.has(ext.id) ? ext : null;
              return (
                <MarketplaceCard
                  key={ext.id}
                  extension={ext}
                  installedExtension={installedExt}
                  onInstall={handleInstall}
                  onEnable={handleEnable}
                  onDisable={handleDisable}
                  onConfigure={handleConfigure}
                  isLoading={actionLoading === ext.id}
                />
              );
            })}
          </div>
        )
      )}

      {/* Config Dialog */}
      <ConfigDialog
        extension={selectedExtension}
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        onSave={handleSaveConfig}
        isSaving={isSavingConfig}
      />
    </div>
  );
}

// Agent personality presets
const personalityPresets = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Formal and business-like communication',
    prompt: 'You are a professional assistant. Communicate in a formal, business-appropriate manner. Be concise, accurate, and helpful. Avoid casual language or humor unless appropriate for the context.',
  },
  {
    id: 'friendly',
    name: 'Friendly',
    description: 'Warm and approachable communication',
    prompt: 'You are a friendly and approachable assistant. Communicate in a warm, conversational tone. Be helpful and encouraging. Use casual language when appropriate but remain professional.',
  },
  {
    id: 'casual',
    name: 'Casual',
    description: 'Relaxed and informal communication',
    prompt: 'You are a casual and relaxed assistant. Communicate informally like a friend would. Be natural, use everyday language, and feel free to use humor when appropriate.',
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Precise and detailed technical communication',
    prompt: 'You are a technical expert assistant. Provide detailed, accurate, and precise information. Use appropriate technical terminology. Include code examples and documentation references when helpful.',
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Imaginative and expressive communication',
    prompt: 'You are a creative and imaginative assistant. Think outside the box, offer unique perspectives, and express ideas in engaging ways. Be playful with language while remaining helpful.',
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Write your own personality description',
    prompt: '',
  },
];

// Agent Settings Tab
function AgentTab() {
  const [agentSettings, setAgentSettings] = useState({
    name: 'Agent',
    emoji: '',
    vibe: '',
    personalityPreset: 'friendly',
    customPrompt: '',
    userName: '',
    userNotes: '',
  });

  // AI Provider settings
  const [providerSettings, setProviderSettings] = useState({
    provider: 'local' as 'local' | 'claude' | 'openai',
    local: {
      url: config.ollamaUrl,
      model: 'qwen2.5:latest',
    },
    claude: {
      apiKey: '',
      model: 'claude-sonnet-4-5-20250929',
    },
    openai: {
      apiKey: '',
      model: 'gpt-4',
    },
  });
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load settings from backend on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load personality settings from localStorage
      const saved = localStorage.getItem('agent-settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setAgentSettings(prev => ({ ...prev, ...parsed }));
        } catch {
          // Ignore parse errors
        }
      }

      // Load AI provider settings from backend
      const response = await fetch(`${BACKEND_URL}/api/settings`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setProviderSettings(prev => ({
            ...prev,
            provider: data.settings.provider || 'local',
            local: data.settings.local || prev.local,
            claude: {
              ...prev.claude,
              apiKey: data.settings.claude?.apiKey ? '••••••••' : '',
              model: data.settings.claude?.model || prev.claude.model,
            },
            openai: {
              ...prev.openai,
              apiKey: data.settings.openai?.apiKey ? '••••••••' : '',
              model: data.settings.openai?.model || prev.openai.model,
            },
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Save personality settings to localStorage
      localStorage.setItem('agent-settings', JSON.stringify(agentSettings));

      // Save AI provider settings to backend
      const response = await fetch(`${BACKEND_URL}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerSettings.provider,
          local: providerSettings.local,
          claude: {
            ...providerSettings.claude,
            apiKey: providerSettings.claude.apiKey === '••••••••' ? undefined : providerSettings.claude.apiKey,
          },
          openai: {
            ...providerSettings.openai,
            apiKey: providerSettings.openai.apiKey === '••••••••' ? undefined : providerSettings.openai.apiKey,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);

      // Reload to get masked keys
      await loadSettings();
    } catch (err) {
      console.error('Save error:', err);
      setSaveMessage('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/agents/status`);
      const data = await response.json();

      if (data.success) {
        const activeAgent = data.agents.find((a: any) => a.type === providerSettings.provider);
        if (activeAgent && activeAgent.status === 'online') {
          setConnectionStatus({ success: true, message: `${activeAgent.name} is online!` });
        } else {
          setConnectionStatus({ success: false, message: `${providerSettings.provider} is offline` });
        }
      } else {
        setConnectionStatus({ success: false, message: 'Failed to check connection' });
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus({ success: false, message: 'Connection test failed' });
    } finally {
      setTestingConnection(false);
      setTimeout(() => setConnectionStatus(null), 5000);
    }
  };

  const selectedPreset = personalityPresets.find(p => p.id === agentSettings.personalityPreset);
  const effectivePrompt = agentSettings.personalityPreset === 'custom'
    ? agentSettings.customPrompt
    : selectedPreset?.prompt || '';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agent Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Customize your AI agent's personality and behavior
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Save message */}
      {saveMessage && (
        <div className={cn(
          "rounded-lg p-3 text-sm",
          saveMessage.includes('success')
            ? "bg-green-500/10 text-green-500"
            : "bg-red-500/10 text-red-500"
        )}>
          {saveMessage}
        </div>
      )}

      {/* AI Provider Configuration */}
      <div className="rounded-lg border p-6 space-y-4 bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              AI Provider
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Configure which AI model powers your agent
            </p>
          </div>
          <Button
            onClick={testConnection}
            disabled={testingConnection}
            variant="outline"
            size="sm"
          >
            {testingConnection ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Test Connection
              </>
            )}
          </Button>
        </div>

        {/* Connection Status */}
        {connectionStatus && (
          <div className={cn(
            "rounded-lg p-3 text-sm flex items-center gap-2",
            connectionStatus.success
              ? "bg-green-500/10 text-green-500"
              : "bg-red-500/10 text-red-500"
          )}>
            {connectionStatus.success ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {connectionStatus.message}
          </div>
        )}

        {/* Provider Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Provider</label>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              onClick={() => setProviderSettings(prev => ({ ...prev, provider: 'local' }))}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                providerSettings.provider === 'local'
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              )}
            >
              <p className="font-medium text-sm">🏠 Local (Ollama)</p>
              <p className="text-xs text-muted-foreground mt-1">Free, runs on your machine</p>
            </button>
            <button
              onClick={() => setProviderSettings(prev => ({ ...prev, provider: 'claude' }))}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                providerSettings.provider === 'claude'
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              )}
            >
              <p className="font-medium text-sm">🧠 Claude API</p>
              <p className="text-xs text-muted-foreground mt-1">Best quality, requires API key</p>
            </button>
            <button
              onClick={() => setProviderSettings(prev => ({ ...prev, provider: 'openai' }))}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                providerSettings.provider === 'openai'
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              )}
            >
              <p className="font-medium text-sm">🤖 OpenAI</p>
              <p className="text-xs text-muted-foreground mt-1">GPT-4, requires API key</p>
            </button>
          </div>
        </div>

        {/* Local Settings */}
        {providerSettings.provider === 'local' && (
          <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ollama URL</label>
              <Input
                value={providerSettings.local.url}
                onChange={(e) => setProviderSettings(prev => ({
                  ...prev,
                  local: { ...prev.local, url: e.target.value }
                }))}
                placeholder={config.ollamaUrl}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Input
                value={providerSettings.local.model}
                onChange={(e) => setProviderSettings(prev => ({
                  ...prev,
                  local: { ...prev.local, model: e.target.value }
                }))}
                placeholder="qwen2.5:latest"
              />
            </div>
          </div>
        )}

        {/* Claude Settings */}
        {providerSettings.provider === 'claude' && (
          <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <div className="relative">
                <Input
                  type={showClaudeKey ? 'text' : 'password'}
                  value={providerSettings.claude.apiKey}
                  onChange={(e) => setProviderSettings(prev => ({
                    ...prev,
                    claude: { ...prev.claude, apiKey: e.target.value }
                  }))}
                  placeholder="sk-ant-..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowClaudeKey(!showClaudeKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showClaudeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Input
                value={providerSettings.claude.model}
                onChange={(e) => setProviderSettings(prev => ({
                  ...prev,
                  claude: { ...prev.claude, model: e.target.value }
                }))}
                placeholder="claude-sonnet-4-5-20250929"
              />
            </div>
          </div>
        )}

        {/* OpenAI Settings */}
        {providerSettings.provider === 'openai' && (
          <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <div className="relative">
                <Input
                  type={showOpenAIKey ? 'text' : 'password'}
                  value={providerSettings.openai.apiKey}
                  onChange={(e) => setProviderSettings(prev => ({
                    ...prev,
                    openai: { ...prev.openai, apiKey: e.target.value }
                  }))}
                  placeholder="sk-..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showOpenAIKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  platform.openai.com
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Input
                value={providerSettings.openai.model}
                onChange={(e) => setProviderSettings(prev => ({
                  ...prev,
                  openai: { ...prev.openai, model: e.target.value }
                }))}
                placeholder="gpt-4"
              />
            </div>
          </div>
        )}
      </div>

      {/* Agent Identity */}
      <div className="rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Agent Identity
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Agent Name</label>
            <Input
              value={agentSettings.name}
              onChange={(e) => setAgentSettings(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Jarvis, Friday, Max"
            />
            <p className="text-xs text-muted-foreground">
              Give your agent a unique name
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Agent Emoji</label>
            <Input
              value={agentSettings.emoji}
              onChange={(e) => setAgentSettings(prev => ({ ...prev, emoji: e.target.value }))}
              placeholder="e.g., 🤖, 🧠, ✨"
              maxLength={2}
            />
            <p className="text-xs text-muted-foreground">
              An emoji to represent your agent
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Vibe / Short Description</label>
          <Input
            value={agentSettings.vibe}
            onChange={(e) => setAgentSettings(prev => ({ ...prev, vibe: e.target.value }))}
            placeholder="e.g., Helpful, witty, and always ready to assist"
          />
          <p className="text-xs text-muted-foreground">
            A short description of your agent's personality
          </p>
        </div>
      </div>

      {/* Personality Settings */}
      <div className="rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Personality & Tone
        </h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">Personality Preset</label>
          <div className="grid gap-2 sm:grid-cols-3">
            {personalityPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setAgentSettings(prev => ({ ...prev, personalityPreset: preset.id }))}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  agentSettings.personalityPreset === preset.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                )}
              >
                <p className="font-medium text-sm">{preset.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>

        {agentSettings.personalityPreset === 'custom' ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Personality Prompt</label>
            <textarea
              value={agentSettings.customPrompt}
              onChange={(e) => setAgentSettings(prev => ({ ...prev, customPrompt: e.target.value }))}
              placeholder="Describe how your agent should behave, communicate, and respond..."
              className="w-full min-h-[150px] rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Write a detailed description of your agent's personality and communication style
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Current System Prompt</label>
            <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
              {effectivePrompt}
            </div>
          </div>
        )}
      </div>

      {/* User Context */}
      <div className="rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          User Context
        </h3>
        <p className="text-sm text-muted-foreground">
          Help your agent understand you better for more personalized responses
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">Your Name</label>
          <Input
            value={agentSettings.userName}
            onChange={(e) => setAgentSettings(prev => ({ ...prev, userName: e.target.value }))}
            placeholder="How should the agent address you?"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notes & Preferences</label>
          <textarea
            value={agentSettings.userNotes}
            onChange={(e) => setAgentSettings(prev => ({ ...prev, userNotes: e.target.value }))}
            placeholder="Add any context about yourself, your projects, preferences, or what you're working on..."
            className="w-full min-h-[100px] rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            This information helps the agent provide more relevant and personalized assistance
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg border bg-muted/30 p-6">
        <h3 className="font-semibold mb-4">Preview</h3>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
            {agentSettings.emoji || '🤖'}
          </div>
          <div>
            <p className="font-medium">{agentSettings.name || 'Agent'}</p>
            <p className="text-sm text-muted-foreground">
              {agentSettings.vibe || 'Your AI assistant'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tone: {selectedPreset?.name || 'Custom'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skill Creator Wizard
type SkillCategory = 'development' | 'productivity' | 'communication' | 'utilities' | 'ai' | 'media' | 'data' | 'automation' | 'other';

interface SkillFormData {
  name: string;
  displayName: string;
  description: string;
  emoji: string;
  category: SkillCategory;
  tags: string[];
  triggers: string[];
  version: string;
  author: string;
  instructions: string;
  includeScripts: boolean;
  includeReferences: boolean;
  includeAssets: boolean;
}

const defaultFormData: SkillFormData = {
  name: '',
  displayName: '',
  description: '',
  emoji: '',
  category: 'other',
  tags: [],
  triggers: [],
  version: '1.0.0',
  author: '',
  instructions: '',
  includeScripts: false,
  includeReferences: false,
  includeAssets: false,
};

const skillTemplates = [
  {
    id: 'blank',
    name: 'Blank Skill',
    description: 'Start from scratch',
    icon: FileText,
    data: {
      ...defaultFormData,
      instructions: '# Skill Name\n\nAdd your instructions here...',
    }
  },
  {
    id: 'cli-tool',
    name: 'CLI Tool',
    description: 'Wrap a command-line tool',
    icon: Terminal,
    data: {
      ...defaultFormData,
      category: 'utilities' as SkillCategory,
      description: 'Use when the user needs to...',
      instructions: `# Tool Name

Use the \`tool-name\` CLI for this task.

## Basic Usage

\`\`\`bash
tool-name command [options]
\`\`\`

## Common Commands

### Command 1
\`\`\`bash
tool-name command1 --flag value
\`\`\`

### Command 2
\`\`\`bash
tool-name command2 --option value
\`\`\`

## Tips
- Tip 1
- Tip 2`,
      includeReferences: true,
    }
  },
  {
    id: 'api-integration',
    name: 'API Integration',
    description: 'Integrate with an external API',
    icon: Code,
    data: {
      ...defaultFormData,
      category: 'development' as SkillCategory,
      description: 'Interact with API Name for...',
      instructions: `# API Name Integration

## Authentication

Set the API key in environment:
\`\`\`bash
export API_KEY="your-key"
\`\`\`

## Endpoints

### GET /endpoint
\`\`\`bash
curl -s "https://api.example.com/endpoint" \\
  -H "Authorization: Bearer $API_KEY"
\`\`\`

### POST /endpoint
\`\`\`bash
curl -s -X POST "https://api.example.com/endpoint" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "value"}'
\`\`\`

## Response Handling

Parse JSON responses with \`jq\`:
\`\`\`bash
curl -s "https://api.example.com/endpoint" | jq '.data'
\`\`\``,
      includeScripts: true,
      includeReferences: true,
    }
  },
  {
    id: 'workflow',
    name: 'Workflow',
    description: 'Multi-step process or automation',
    icon: Wand2,
    data: {
      ...defaultFormData,
      category: 'automation' as SkillCategory,
      description: 'Guide for completing... Use when the user needs to...',
      instructions: `# Workflow Name

## Overview

This workflow helps you accomplish X by following these steps.

## Prerequisites

- Requirement 1
- Requirement 2

## Steps

### Step 1: Setup
Description of first step...

### Step 2: Execute
Description of second step...

### Step 3: Verify
Description of verification...

## Troubleshooting

### Common Issue 1
Solution...

### Common Issue 2
Solution...`,
      includeScripts: true,
      includeAssets: true,
    }
  },
];

function toHyphenCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Generate skill.json content
function generateSkillJson(data: SkillFormData): object {
  const config: Record<string, unknown> = {
    name: data.name || 'untitled',
    displayName: data.displayName || data.name || 'Untitled Skill',
    description: data.description || 'No description provided',
    version: data.version || '1.0.0',
    category: data.category || 'other',
  };

  if (data.emoji) config.emoji = data.emoji;
  if (data.author) config.author = data.author;
  if (data.tags.length > 0) config.tags = data.tags;
  if (data.triggers.length > 0) config.triggers = data.triggers;

  config.enabled = true;

  return config;
}

// Generate SKILL.md content (just the instructions)
function generateSkillMd(data: SkillFormData): string {
  return data.instructions || '# Skill Instructions\n\nAdd your instructions here...';
}

// Generate preview text for display
function generatePreviewText(data: SkillFormData): string {
  const json = JSON.stringify(generateSkillJson(data), null, 2);
  return `=== skill.json ===\n${json}\n\n=== SKILL.md ===\n${data.instructions}`;
}

function SkillCreatorDialog({
  open,
  onOpenChange,
  onSkillCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSkillCreated: () => void;
}) {
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState<SkillFormData>({ ...defaultFormData });
  const [tagInput, setTagInput] = useState('');
  const [triggerInput, setTriggerInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const steps = [
    { title: 'Template', description: 'Choose a starting point' },
    { title: 'Details', description: 'Name, description & metadata' },
    { title: 'Instructions', description: 'Write skill instructions' },
    { title: 'Preview', description: 'Review and create' },
  ];

  const resetForm = () => {
    setStep(0);
    setSelectedTemplate(null);
    setFormData({ ...defaultFormData });
    setTagInput('');
    setTriggerInput('');
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = skillTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setFormData(prev => ({
        ...prev,
        ...template.data,
      }));
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const skillName = formData.name || 'untitled-skill';
      const skillConfig = generateSkillJson(formData);
      const skillInstructions = generateSkillMd(formData);

      // Call API to create skill with new format
      const response = await fetch('/api/skills/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: skillName,
          config: skillConfig,           // skill.json content
          instructions: skillInstructions, // SKILL.md content
          includeScripts: formData.includeScripts,
          includeReferences: formData.includeReferences,
          includeAssets: formData.includeAssets,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create skill');
      }

      // Reload backend registry
      await skillsClient.reload();
      onSkillCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create skill:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateSkillMd(formData));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return selectedTemplate !== null;
      case 1: return formData.name.length > 0 && formData.description.length > 0;
      case 2: return formData.instructions.length > 10;
      default: return true;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Create New Skill
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-2 py-4 border-b">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    i < step ? "bg-green-500 text-white" :
                    i === step ? "bg-primary text-primary-foreground" :
                    "bg-muted text-muted-foreground"
                  )}
                >
                  {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={cn(
                  "text-xs mt-1",
                  i === step ? "text-primary font-medium" : "text-muted-foreground"
                )}>
                  {s.title}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  "w-16 h-0.5 mx-2",
                  i < step ? "bg-green-500" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4 px-1">
          {/* Step 0: Template Selection */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose a template to get started quickly, or start from scratch.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {skillTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:border-primary",
                      selectedTemplate === template.id && "border-primary bg-primary/5 ring-2 ring-primary/20"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      selectedTemplate === template.id ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <template.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                    {selectedTemplate === template.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Basic Details */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Name & Emoji Row */}
              <div className="grid gap-4 md:grid-cols-[1fr,200px,80px]">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Skill ID *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      name: toHyphenCase(e.target.value)
                    }))}
                    placeholder="e.g., pdf-editor, github-pr"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Folder: skills/{formData.name || 'skill-name'}/
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Display Name</label>
                  <Input
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="PDF Editor"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Emoji</label>
                  <Input
                    value={formData.emoji}
                    onChange={(e) => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                    placeholder="📄"
                    maxLength={2}
                    className="text-center text-xl"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this skill does and when the agent should use it."
                  className="w-full min-h-[80px] rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Category & Version Row */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as SkillCategory }))}
                    className="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="development">Development</option>
                    <option value="productivity">Productivity</option>
                    <option value="communication">Communication</option>
                    <option value="utilities">Utilities</option>
                    <option value="ai">AI</option>
                    <option value="media">Media</option>
                    <option value="data">Data</option>
                    <option value="automation">Automation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Version</label>
                  <Input
                    value={formData.version}
                    onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="1.0.0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Author</label>
                  <Input
                    value={formData.author}
                    onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="Your Name"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
                    >
                      #{tag}
                      <button
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          tags: prev.tags.filter((_, idx) => idx !== i)
                        }))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        e.preventDefault();
                        setFormData(prev => ({
                          ...prev,
                          tags: [...prev.tags, tagInput.trim().toLowerCase()]
                        }));
                        setTagInput('');
                      }
                    }}
                    placeholder="Add tag and press Enter"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (tagInput.trim()) {
                        setFormData(prev => ({
                          ...prev,
                          tags: [...prev.tags, tagInput.trim().toLowerCase()]
                        }));
                        setTagInput('');
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Triggers */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Triggers (Commands)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.triggers.map((trigger, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-500 rounded-md text-sm font-mono"
                    >
                      /{trigger}
                      <button
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          triggers: prev.triggers.filter((_, idx) => idx !== i)
                        }))}
                        className="text-blue-400 hover:text-blue-600"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={triggerInput}
                    onChange={(e) => setTriggerInput(e.target.value.replace(/[^a-z0-9-]/gi, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && triggerInput.trim()) {
                        e.preventDefault();
                        setFormData(prev => ({
                          ...prev,
                          triggers: [...prev.triggers, triggerInput.trim().toLowerCase()]
                        }));
                        setTriggerInput('');
                      }
                    }}
                    placeholder="Add trigger (e.g., pdf, convert)"
                    className="flex-1 font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (triggerInput.trim()) {
                        setFormData(prev => ({
                          ...prev,
                          triggers: [...prev.triggers, triggerInput.trim().toLowerCase()]
                        }));
                        setTriggerInput('');
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Commands users can type to invoke this skill (e.g., /pdf, /convert)
                </p>
              </div>

              {/* Include Folders */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Include Folders</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'includeScripts', label: 'scripts/', icon: Code, desc: 'Executable code' },
                    { key: 'includeReferences', label: 'references/', icon: FileText, desc: 'Documentation' },
                    { key: 'includeAssets', label: 'assets/', icon: FolderOpen, desc: 'Templates & files' },
                  ].map(({ key, label, icon: Icon, desc }) => (
                    <button
                      key={key}
                      onClick={() => setFormData(prev => ({ ...prev, [key]: !prev[key as keyof SkillFormData] }))}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
                        formData[key as keyof SkillFormData]
                          ? "border-primary bg-primary/5 text-primary"
                          : "hover:border-muted-foreground/50"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-mono">{label}</span>
                      <span className="text-xs text-muted-foreground">({desc})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Instructions Editor */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Skill Instructions (Markdown)</label>
                  <p className="text-xs text-muted-foreground">
                    Write the instructions the agent will follow when using this skill
                  </p>
                </div>
              </div>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="# Skill Title

Instructions for the agent..."
                className="w-full min-h-[350px] rounded-md border bg-muted/30 px-4 py-3 font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex items-start gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Keep instructions concise. Include code examples when helpful.
                  Reference files in references/ folder for detailed documentation.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Folder Structure Preview */}
              <div className="rounded-lg border p-4 bg-muted/20">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Folder Structure
                </h4>
                <div className="font-mono text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-yellow-500" />
                    <span className="text-foreground font-medium">{formData.name || 'skill-name'}/</span>
                  </div>
                  <div className="ml-6 flex items-center gap-2">
                    <Code className="h-4 w-4 text-blue-500" />
                    <span>skill.json</span>
                    <span className="text-xs text-green-500">(metadata)</span>
                  </div>
                  <div className="ml-6 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-500" />
                    <span>SKILL.md</span>
                    <span className="text-xs text-green-500">(instructions)</span>
                  </div>
                  {formData.emoji && (
                    <div className="ml-6 flex items-center gap-2 text-muted-foreground/50">
                      <span className="text-lg">{formData.emoji}</span>
                      <span className="text-xs">icon (or add icon.png)</span>
                    </div>
                  )}
                  {formData.includeScripts && (
                    <div className="ml-6 flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      <span>scripts/</span>
                    </div>
                  )}
                  {formData.includeReferences && (
                    <div className="ml-6 flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      <span>references/</span>
                    </div>
                  )}
                  {formData.includeAssets && (
                    <div className="ml-6 flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      <span>assets/</span>
                    </div>
                  )}
                </div>
              </div>

              {/* skill.json Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Code className="h-4 w-4 text-blue-500" />
                    skill.json
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(generateSkillJson(formData), null, 2));
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="rounded-lg border bg-muted/30 p-3 overflow-auto max-h-[150px] text-xs font-mono">
                  {JSON.stringify(generateSkillJson(formData), null, 2)}
                </pre>
              </div>

              {/* SKILL.md Preview */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                  SKILL.md
                </h4>
                <pre className="rounded-lg border bg-muted/30 p-3 overflow-auto max-h-[150px] text-xs font-mono whitespace-pre-wrap">
                  {generateSkillMd(formData)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <DialogFooter className="border-t pt-4">
          <div className="flex w-full items-center justify-between">
            <Button
              variant="outline"
              onClick={() => step === 0 ? onOpenChange(false) : setStep(step - 1)}
            >
              {step === 0 ? 'Cancel' : 'Back'}
            </Button>
            <div className="flex gap-2">
              {step < steps.length - 1 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                >
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={isCreating || !canProceed()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Create Skill
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// Skills Tab
function SkillsTab() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [enabledSkills, setEnabledSkills] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [source, setSource] = useState<'installed' | 'marketplace'>('installed');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load enabled skills from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('enabledSkills');
    if (saved) {
      setEnabledSkills(new Set(JSON.parse(saved)));
    }
  }, []);

  // Save enabled skills to localStorage
  const saveEnabledSkills = (enabled: Set<string>) => {
    localStorage.setItem('enabledSkills', JSON.stringify([...enabled]));
    setEnabledSkills(enabled);
  };

  const handleEnableSkill = (skillName: string) => {
    const newEnabled = new Set(enabledSkills);
    newEnabled.add(skillName);
    saveEnabledSkills(newEnabled);
  };

  const handleDisableSkill = (skillName: string) => {
    const newEnabled = new Set(enabledSkills);
    newEnabled.delete(skillName);
    saveEnabledSkills(newEnabled);
  };

  const loadSkills = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use frontend API which reads directly from disk
      const res = await fetch('/api/skills');
      const json = await res.json();
      if (json.success && json.data) {
        setSkills(json.data);
      } else {
        setSkills([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  const handleDelete = async (skillName: string) => {
    setActionLoading(skillName);
    try {
      const response = await fetch(`/api/skills/${encodeURIComponent(skillName)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete skill');
      }

      // Reload skills from disk
      await loadSkills();
      setDeleteDialogOpen(false);
      setSkillToDelete(null);
    } catch (error) {
      console.error('Failed to delete skill:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete skill');
    } finally {
      setActionLoading(null);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique categories from skills
  const categories = [...new Set(skills.map(s => s.category).filter(Boolean))] as string[];

  // Filter skills based on source (installed = enabled only, marketplace = all)
  const filteredSkills = skills.filter(skill => {
    const matchesSearch = searchQuery === '' ||
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = !selectedCategory || skill.category === selectedCategory;

    // In "My Skills" show only enabled, in "Marketplace" show all
    const matchesSource = source === 'marketplace' || enabledSkills.has(skill.name);

    return matchesSearch && matchesCategory && matchesSource;
  });

  // Count enabled skills for the badge
  const enabledCount = skills.filter(s => enabledSkills.has(s.name)).length;

  // Category icons and colors
  const categoryConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    development: { icon: <Code className="h-3 w-3" />, color: 'bg-blue-500/10 text-blue-500' },
    productivity: { icon: <Zap className="h-3 w-3" />, color: 'bg-yellow-500/10 text-yellow-500' },
    communication: { icon: <Bell className="h-3 w-3" />, color: 'bg-green-500/10 text-green-500' },
    utilities: { icon: <Settings className="h-3 w-3" />, color: 'bg-gray-500/10 text-gray-500' },
    ai: { icon: <Sparkles className="h-3 w-3" />, color: 'bg-purple-500/10 text-purple-500' },
    media: { icon: <PlayCircle className="h-3 w-3" />, color: 'bg-pink-500/10 text-pink-500' },
    data: { icon: <Database className="h-3 w-3" />, color: 'bg-cyan-500/10 text-cyan-500' },
    automation: { icon: <RefreshCw className="h-3 w-3" />, color: 'bg-orange-500/10 text-orange-500' },
    other: { icon: <Box className="h-3 w-3" />, color: 'bg-slate-500/10 text-slate-500' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Skills
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage agent skills and browse marketplace
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadSkills}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Skill
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Source Tabs: Installed vs Marketplace */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setSource('installed')}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              source === 'installed'
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Package className="h-4 w-4" />
            My Skills
            <span className="ml-1 rounded-full bg-background/20 px-2 py-0.5 text-xs">
              {enabledCount}
            </span>
          </button>
          <button
            onClick={() => setSource('marketplace')}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              source === 'marketplace'
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Store className="h-4 w-4" />
            Marketplace
            <span className="ml-1 rounded-full bg-background/20 px-2 py-0.5 text-xs">
              {skills.length}
            </span>
          </button>
        </div>

        {/* Category Filter */}
        {source === 'installed' && categories.length > 0 && (
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-3 py-1 text-xs rounded-full transition-colors",
                !selectedCategory
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1",
                  selectedCategory === cat
                    ? categoryConfig[cat]?.color || "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {categoryConfig[cat]?.icon}
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 p-4 text-red-500">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <div className="flex-1">
              <p>{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500/70 hover:text-red-500"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* My Skills */}
      {source === 'installed' && (
        <>
          {filteredSkills.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Terminal className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="font-medium">
                {searchQuery ? 'No matching skills' : 'No skills installed'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? `No skills match "${searchQuery}"`
                  : 'Create your first skill to extend agent capabilities'
                }
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Create Your First Skill
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredSkills.map((skill) => (
                <div
                  key={skill.name}
                  className="relative flex flex-col rounded-xl border bg-card p-4 transition-all hover:shadow-lg hover:border-primary/50"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    {/* Icon/Emoji */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-2xl shrink-0">
                      {skill.emoji || (skill.iconPath ? (
                        <img
                          src={`/api/skills/${skill.name}/icon`}
                          alt={skill.name}
                          className="h-8 w-8 rounded-lg object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Zap className="h-6 w-6 text-primary" />
                      ))}
                    </div>

                    {/* Title & Description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-base truncate">
                          {skill.displayName || skill.name}
                        </h4>
                        {skill.category && categoryConfig[skill.category] && (
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                            categoryConfig[skill.category].color
                          )}>
                            {categoryConfig[skill.category].icon}
                            {skill.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {skill.description || 'No description provided'}
                      </p>
                    </div>

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>
                          <Edit3 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          <ExternalLinkIcon className="mr-2 h-4 w-4" />
                          View Source
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDisableSkill(skill.name)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Disable
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-500 focus:text-red-500"
                          onClick={() => {
                            setSkillToDelete(skill.name);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Tags */}
                  {skill.tags && skill.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {skill.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-md"
                        >
                          #{tag}
                        </span>
                      ))}
                      {skill.tags.length > 4 && (
                        <span className="px-2 py-0.5 text-muted-foreground text-xs">
                          +{skill.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        v{skill.version}
                      </span>
                      {skill.author && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {skill.author}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {skill.triggers && skill.triggers.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-500 text-xs rounded-full font-mono">
                          /{skill.triggers[0]}
                        </span>
                      )}
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                        skill.enabled !== false
                          ? "bg-green-500/10 text-green-500"
                          : "bg-gray-500/10 text-gray-500"
                      )}>
                        {skill.enabled !== false ? (
                          <><CheckCircle2 className="h-3 w-3" /> Active</>
                        ) : (
                          <><XCircle className="h-3 w-3" /> Disabled</>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Marketplace */}
      {source === 'marketplace' && (
        <>
          {filteredSkills.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Store className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="font-medium">No skills available</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create your own skill to get started
              </p>
              <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                <Wand2 className="mr-2 h-4 w-4" />
                Create Skill
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredSkills.map((skill) => {
                const isEnabled = enabledSkills.has(skill.name);
                return (
                  <div
                    key={skill.name}
                    className={cn(
                      "relative flex flex-col rounded-xl border bg-card p-4 transition-all hover:shadow-lg",
                      isEnabled ? "border-green-500/50 bg-green-500/5" : "hover:border-primary/50"
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      {/* Icon/Emoji */}
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-2xl shrink-0">
                        {skill.emoji || <Zap className="h-6 w-6 text-primary" />}
                      </div>

                      {/* Title & Description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-base truncate">
                            {skill.displayName || skill.name}
                          </h4>
                          {skill.category && categoryConfig[skill.category] && (
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                              categoryConfig[skill.category].color
                            )}>
                              {categoryConfig[skill.category].icon}
                              {skill.category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {skill.description || 'No description provided'}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    {skill.tags && skill.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {skill.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-md"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer with Enable/Disable button */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>v{skill.version}</span>
                        {skill.author && (
                          <>
                            <span>•</span>
                            <span>{skill.author}</span>
                          </>
                        )}
                      </div>
                      {isEnabled ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDisableSkill(skill.name)}
                          className="text-green-600 border-green-500/50 hover:bg-green-500/10"
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Enabled
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleEnableSkill(skill.name)}
                        >
                          <Download className="mr-1 h-4 w-4" />
                          Enable
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create Skill Dialog */}
      <SkillCreatorDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSkillCreated={loadSkills}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Skill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{skillToDelete}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => skillToDelete && handleDelete(skillToDelete)}
              className="bg-red-500 hover:bg-red-600"
            >
              {actionLoading === skillToDelete ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Placeholder tabs
function ProfileTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your account settings</p>
      </div>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Coming soon...
      </div>
    </div>
  );
}

function NotificationsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground">Configure notification preferences</p>
      </div>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Coming soon...
      </div>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="text-sm text-muted-foreground">Manage security settings and API keys</p>
      </div>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Coming soon...
      </div>
    </div>
  );
}

function DatabaseTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Database</h2>
        <p className="text-sm text-muted-foreground">Database configuration and maintenance</p>
      </div>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Coming soon...
      </div>
    </div>
  );
}

function DeveloperTab() {
  const { devMode, setDevMode } = useDeveloperMode();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Developer Settings</h2>
        <p className="text-sm text-muted-foreground">
          Tools and utilities for development and debugging
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Developer Mode</p>
            <p className="text-xs text-muted-foreground">
              Enable the Developer section in the sidebar with debug tools and component previews
            </p>
          </div>
          <button
            role="switch"
            aria-checked={devMode}
            onClick={() => setDevMode(!devMode)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              devMode ? 'bg-amber-500' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform',
                devMode ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {devMode && (
          <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Developer mode is active — &quot;Developer&quot; section is now visible in the sidebar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const validTabs = tabs.map(t => t.id);

  // Get initial tab from URL or default to 'agent'
  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'agent';

  const [activeTab, setActiveTab] = useState(initialTab);

  // Update URL when tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/dashboard/settings?tab=${tabId}`, { scroll: false });
  };

  // Sync with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && validTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab, validTabs]);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences
        </p>
      </div>

      {/* Settings Layout — fills remaining height so both sidebar and content scroll independently */}
      <div className="flex min-h-0 flex-1 gap-6">
        {/* Sidebar — own scroll */}
        <div className="w-48 shrink-0 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content — own scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border bg-card p-6">
          {activeTab === 'agent' && <AgentTab />}
          {activeTab === 'skills' && <SkillsTab />}
          {activeTab === 'extensions' && <ExtensionsTab />}
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'database' && <DatabaseTab />}
          {activeTab === 'developer' && <DeveloperTab />}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
