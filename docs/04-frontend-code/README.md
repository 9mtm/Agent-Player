# 🎨 Frontend Code Organization

## 📋 Frontend Structure Overview

**Agent Player** frontend is built with React TypeScript following component-based architecture.

### 🏗️ Current Frontend Structure
```
frontend/src/
├── components/           ✅ Reusable components
│   ├── ui/              ✅ UI component library (10 components)
│   ├── Layout/          ✅ Layout components
│   ├── Auth/            ✅ Authentication components
│   └── Board/           ✅ Board components
├── pages/               ✅ Page components (20+ pages)
│   ├── Dashboard/       ✅ Complete with hooks/types
│   ├── Settings/        ✅ Comprehensive settings
│   ├── Board/           ✅ Workflow board
│   ├── Chat/            ✅ Chat system
│   ├── Agent/           ✅ Agent management
│   └── ...              ✅ 15+ other pages
├── services/            ✅ API integration (17 services)
├── hooks/               ✅ Custom React hooks
├── context/             ✅ State management
├── types/               ✅ TypeScript definitions
└── utils/               ✅ Helper functions
```

### 🆕 Enhanced Frontend Structure
```
frontend/src/
├── components/           ✅ Enhanced + new components
│   ├── ui/              ✅ Enhanced UI library (20+ components)
│   │   ├── button.tsx   ✅ Enhanced with more variants
│   │   ├── modal.tsx    🆕 New modal system
│   │   ├── dropdown.tsx 🆕 Dropdown component
│   │   ├── datepicker.tsx 🆕 Date picker
│   │   ├── colorpicker.tsx 🆕 Color picker
│   │   ├── theme-provider.tsx 🆕 Theme system
│   │   └── ...          🆕 10+ new components
│   └── ...              ✅ Enhanced existing
├── pages/               ✅ Enhanced + consolidated
│   ├── TrainingLab/     🆕 Unified training environment
│   │   ├── TrainingLabPage.tsx
│   │   ├── components/  🆕 Training-specific components
│   │   ├── hooks/       🆕 Training hooks
│   │   └── types/       🆕 Training types
│   ├── AITrainer/       🆕 AI course generation
│   ├── Themes/          ✅ Enhanced theme system
│   ├── License/         ✅ Enhanced licensing
│   └── ...              ✅ All existing pages enhanced
├── services/            ✅ Enhanced + new services
│   ├── themeEngine.ts   🆕 Theme management
│   ├── aiTrainer.ts     🆕 AI trainer service
│   ├── formBuilder.ts   🆕 Form builder service
│   └── ...              ✅ Enhanced existing
└── ...                  ✅ Enhanced all folders
```

### 🎯 Code Organization Rules

#### 1. **Component Structure**
```typescript
// Each component follows this pattern:
ComponentName/
├── ComponentName.tsx     // Main component
├── components/           // Sub-components
│   ├── SubComponent1.tsx
│   ├── SubComponent2.tsx
│   └── index.ts         // Barrel exports
├── hooks/               // Component-specific hooks
│   ├── useComponentName.ts
│   └── index.ts
├── types/               // TypeScript definitions
│   └── index.ts
├── utils/               // Helper functions
│   └── constants.ts
└── index.ts             // Main export
```

#### 2. **UI Component Standards**
```typescript
// Example: Enhanced Button component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' | 'gradient';
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  tooltip?: string;
  className?: string;
  children: React.ReactNode;
}
```

#### 3. **Page Structure Standards**
```typescript
// Each page follows this pattern:
const PageName: React.FC = () => {
  // Custom hooks for data management
  const { data, loading, error } = usePageData();
  const { config, updateConfig } = usePageConfig();
  
  // Local state
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Event handlers
  const handleAction = useCallback(() => {
    // Handle action
  }, []);
  
  // Render logic with proper error/loading states
  if (loading) return <LoadingComponent />;
  if (error) return <ErrorComponent error={error} />;
  
  return (
    <PageLayout>
      <PageHeader />
      <PageContent />
    </PageLayout>
  );
};
```

### 📊 Code Quality Standards

#### ✅ **React Best Practices**
- Functional components with hooks
- TypeScript for all components
- Proper prop typing
- Custom hooks for logic reuse
- Memoization for performance
- Error boundaries
- Accessibility (a11y) compliance

#### 🎨 **UI/UX Standards**
- Consistent design system
- Responsive design (mobile-first)
- Theme switching support
- Loading states for all actions
- Error handling with user feedback
- Smooth animations and transitions
- Keyboard navigation support

#### 🔧 **Performance Standards**
- Code splitting by routes
- Lazy loading for heavy components
- Image optimization
- Bundle size optimization
- React.memo for expensive components
- useCallback/useMemo for optimization

### 📁 Key Features Implementation

#### 1. **Training Lab** (Unified Environment)
```typescript
// Merge Board + WorkFlow + ChildAgent into TrainingLab
frontend/src/pages/TrainingLab/
├── TrainingLabPage.tsx           // Main unified interface
├── components/
│   ├── workspace/
│   │   ├── WorkspaceCanvas.tsx   // Drag-drop workspace
│   │   ├── ComponentPalette.tsx  // Component library
│   │   └── PropertyPanel.tsx     // Property editor
│   ├── agent-creator/
│   │   ├── AgentBuilder.tsx      // Agent creation
│   │   ├── CapabilityEditor.tsx  // Capability management
│   │   └── AgentPreview.tsx      // Agent preview
│   ├── llm-config/
│   │   ├── LLMConfigurator.tsx   // LLM settings
│   │   ├── ModelSelector.tsx     // Model selection
│   │   └── PromptEditor.tsx      // Prompt editing
│   └── testing/
│       ├── TestEnvironment.tsx   // Testing interface
│       ├── TestRunner.tsx        // Test execution
│       └── ResultsViewer.tsx     // Results display
└── hooks/
    ├── useTrainingLab.ts         // Main training logic
    ├── useAgentCreator.ts        // Agent creation logic
    └── useWorkspace.ts           // Workspace management
```

#### 2. **Theme System** (Complete Customization)
```typescript
// Theme system implementation
frontend/src/components/ui/theme-provider.tsx
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: Theme[];
  createCustomTheme: (config: ThemeConfig) => Theme;
  exportTheme: (theme: Theme) => string;
  importTheme: (themeData: string) => Theme;
}
```

#### 3. **Enhanced UI Components**
```typescript
// New components to implement:
- Modal (with animations)
- Dropdown (with keyboard navigation)
- DatePicker (with localization)
- ColorPicker (with presets)
- DataTable (with sorting/filtering)
- TreeView (with drag-drop)
- FormBuilder (drag-drop form designer)
```

### 📁 Implementation Tasks

#### **Week 1-2: Component Library**
- [ ] Enhance existing UI components
- [ ] Create 10+ new UI components
- [ ] Implement theme provider system
- [ ] Add animation utilities

#### **Week 3-4: Training Lab**
- [ ] Design unified Training Lab interface
- [ ] Merge Board/WorkFlow/ChildAgent functionality
- [ ] Implement drag-drop workspace
- [ ] Create agent builder interface

#### **Week 5-6: Advanced Features**
- [ ] Implement AI Trainer interface
- [ ] Enhance Form Builder
- [ ] Add theme marketplace
- [ ] Create licensing interface

#### **Week 7-8: Integration & Polish**
- [ ] Connect all frontend to new APIs
- [ ] Add comprehensive error handling
- [ ] Performance optimization
- [ ] Accessibility improvements

### 🛠️ Development Environment

#### **Required Tools**
- Node.js 18+
- React 18
- TypeScript 5+
- Vite (build tool)
- ESLint (linting)
- Prettier (formatting)
- React Testing Library

#### **Development Commands**
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

### 🎨 Design System Guidelines

#### **Color Palette**
```css
:root {
  --primary-50: #eff6ff;
  --primary-500: #3b82f6;
  --primary-900: #1e3a8a;
  /* ... complete color system */
}
```

#### **Typography Scale**
```css
.text-xs { font-size: 0.75rem; }    /* 12px */
.text-sm { font-size: 0.875rem; }   /* 14px */
.text-base { font-size: 1rem; }     /* 16px */
/* ... complete typography system */
```

#### **Spacing System**
```css
.space-1 { margin: 0.25rem; }   /* 4px */
.space-2 { margin: 0.5rem; }    /* 8px */
.space-4 { margin: 1rem; }      /* 16px */
/* ... complete spacing system */
``` 