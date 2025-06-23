# 🎨 Design System Documentation

## 📋 Design System Overview

**Agent Player** design system provides a comprehensive set of design tokens, components, and guidelines for consistent UI/UX across the platform.

### 🎯 Design Principles

1. **Consistency** - Unified visual language
2. **Accessibility** - WCAG 2.1 AA compliance
3. **Scalability** - Modular and extensible
4. **Performance** - Optimized for speed
5. **Flexibility** - Theme system support

### 🎨 Color System

#### **Primary Colors**
```css
:root {
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-200: #bfdbfe;
  --primary-300: #93c5fd;
  --primary-400: #60a5fa;
  --primary-500: #3b82f6;  /* Main brand color */
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  --primary-800: #1e40af;
  --primary-900: #1e3a8a;
}
```

#### **Semantic Colors**
```css
:root {
  /* Success Colors */
  --success-50: #f0fdf4;
  --success-500: #22c55e;
  --success-900: #14532d;
  
  /* Warning Colors */
  --warning-50: #fffbeb;
  --warning-500: #f59e0b;
  --warning-900: #78350f;
  
  /* Error Colors */
  --error-50: #fef2f2;
  --error-500: #ef4444;
  --error-900: #7f1d1d;
  
  /* Info Colors */
  --info-50: #f0f9ff;
  --info-500: #06b6d4;
  --info-900: #164e63;
}
```

#### **Neutral Colors**
```css
:root {
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
}
```

### 📝 Typography System

#### **Font Families**
```css
:root {
  --font-primary: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", Monaco, Consolas, monospace;
}
```

#### **Font Sizes**
```css
.text-xs { font-size: 0.75rem; line-height: 1rem; }      /* 12px */
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }  /* 14px */
.text-base { font-size: 1rem; line-height: 1.5rem; }     /* 16px */
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }  /* 18px */
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }   /* 20px */
.text-2xl { font-size: 1.5rem; line-height: 2rem; }      /* 24px */
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; } /* 30px */
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }   /* 36px */
```

#### **Font Weights**
```css
.font-thin { font-weight: 100; }
.font-light { font-weight: 300; }
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.font-extrabold { font-weight: 800; }
```

### 📏 Spacing System

#### **Spacing Scale**
```css
.space-0 { margin: 0; }
.space-1 { margin: 0.25rem; }    /* 4px */
.space-2 { margin: 0.5rem; }     /* 8px */
.space-3 { margin: 0.75rem; }    /* 12px */
.space-4 { margin: 1rem; }       /* 16px */
.space-5 { margin: 1.25rem; }    /* 20px */
.space-6 { margin: 1.5rem; }     /* 24px */
.space-8 { margin: 2rem; }       /* 32px */
.space-10 { margin: 2.5rem; }    /* 40px */
.space-12 { margin: 3rem; }      /* 48px */
.space-16 { margin: 4rem; }      /* 64px */
.space-20 { margin: 5rem; }      /* 80px */
.space-24 { margin: 6rem; }      /* 96px */
```

### 📦 Component Library

#### **Button Variants**
```typescript
interface ButtonProps {
  variant?: 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' | 'gradient';
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}
```

**Button Examples:**
- **Primary**: Main actions (Save, Submit, Create)
- **Secondary**: Supporting actions (Cancel, Back)
- **Destructive**: Dangerous actions (Delete, Remove)
- **Outline**: Neutral actions (View, Edit)
- **Ghost**: Subtle actions (Close, Minimize)

#### **Card Variants**
```typescript
interface CardProps {
  variant?: 'default' | 'outlined' | 'elevated' | 'interactive';
  padding?: 'none' | 'sm' | 'default' | 'lg' | 'xl';
  borderRadius?: 'none' | 'sm' | 'default' | 'lg' | 'full';
}
```

#### **Input Variants**
```typescript
interface InputProps {
  variant?: 'default' | 'outlined' | 'filled' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  state?: 'default' | 'error' | 'success' | 'warning';
  icon?: React.ReactNode;
  helper?: string;
}
```

### 🎭 Animation System

#### **Transitions**
```css
:root {
  --transition-fast: 150ms ease-in-out;
  --transition-base: 250ms ease-in-out;
  --transition-slow: 350ms ease-in-out;
}

.transition-fast { transition: all var(--transition-fast); }
.transition-base { transition: all var(--transition-base); }
.transition-slow { transition: all var(--transition-slow); }
```

#### **Animation Presets**
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideDown {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes scale {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

### 🌙 Theme System

#### **Theme Structure**
```typescript
interface Theme {
  id: string;
  name: string;
  type: 'light' | 'dark' | 'auto';
  colors: {
    primary: ColorPalette;
    secondary: ColorPalette;
    neutral: ColorPalette;
    semantic: SemanticColors;
  };
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: Shadows;
}
```

#### **Default Themes**
- **Light Theme**: Clean and professional
- **Dark Theme**: Modern dark interface
- **Auto Theme**: System preference based
- **High Contrast**: Accessibility focused
- **Custom Themes**: User-created themes

### 📱 Responsive Design

#### **Breakpoints**
```css
:root {
  --breakpoint-sm: 640px;   /* Mobile */
  --breakpoint-md: 768px;   /* Tablet */
  --breakpoint-lg: 1024px;  /* Desktop */
  --breakpoint-xl: 1280px;  /* Large Desktop */
  --breakpoint-2xl: 1536px; /* Extra Large */
}
```

#### **Container Sizes**
```css
.container-sm { max-width: 640px; }
.container-md { max-width: 768px; }
.container-lg { max-width: 1024px; }
.container-xl { max-width: 1280px; }
.container-2xl { max-width: 1536px; }
```

### ♿ Accessibility Guidelines

#### **Color Contrast**
- **Normal Text**: 4.5:1 minimum ratio
- **Large Text**: 3:1 minimum ratio
- **UI Components**: 3:1 minimum ratio

#### **Focus Management**
```css
.focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

.focus-ring {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

#### **Screen Reader Support**
```typescript
// ARIA labels for complex components
interface AccessibilityProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  role?: string;
}
```

### 🔧 Implementation Guidelines

#### **Component Development**
1. **Start with design tokens**
2. **Follow naming conventions**
3. **Include accessibility features**
4. **Add proper TypeScript types**
5. **Write comprehensive tests**
6. **Document usage examples**

#### **Theme Implementation**
```typescript
// Theme provider usage
<ThemeProvider theme={selectedTheme}>
  <App />
</ThemeProvider>

// Component theme usage
const Button = styled.button`
  background-color: ${props => props.theme.colors.primary[500]};
  color: ${props => props.theme.colors.primary[50]};
  padding: ${props => props.theme.spacing[2]} ${props => props.theme.spacing[4]};
  border-radius: ${props => props.theme.borderRadius.default};
`;
```

### 📚 Component Documentation

#### **Button Component**
```typescript
// Usage examples
<Button variant="primary" size="lg">
  Primary Button
</Button>

<Button variant="outline" icon={<IconPlus />}>
  Add Item
</Button>

<Button variant="destructive" loading>
  Deleting...
</Button>
```

#### **Card Component**
```typescript
// Usage examples
<Card variant="elevated" padding="lg">
  <CardHeader>
    <CardTitle>Agent Statistics</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Your content here</p>
  </CardContent>
</Card>
```

### 🎯 Design Tokens Export

#### **CSS Custom Properties**
```css
/* Generated from design tokens */
:root {
  /* Colors */
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  
  /* Spacing */
  --spacing-1: 0.25rem;
  --spacing-4: 1rem;
  
  /* Typography */
  --font-size-base: 1rem;
  --line-height-base: 1.5;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-default: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}
```

#### **JavaScript Tokens**
```typescript
export const tokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',
      900: '#1e3a8a'
    }
  },
  spacing: {
    1: '0.25rem',
    4: '1rem'
  },
  typography: {
    sizes: {
      base: '1rem',
      lg: '1.125rem'
    }
  }
};
```

### 🚀 Future Enhancements

1. **Advanced Animations**: Micro-interactions and page transitions
2. **Design Tool Integration**: Figma to code automation
3. **Component Variants**: More customization options
4. **Performance Optimization**: CSS-in-JS optimization
5. **Accessibility Improvements**: Enhanced screen reader support 