# Agent Player — Internationalization (i18n)

Agent Player uses [i18next](https://www.i18next.com/) for translations across both frontend and backend.

English is the default language. The system is designed so anyone can add a new language without modifying core code.

---

## File Structure

```
src/i18n/
  index.ts                  # Frontend i18next initialization
  settings.ts               # Supported locales list + RTL config
  provider.tsx              # Client-side React provider
  locales/
    en/
      common.json           # Shared UI strings (buttons, labels, statuses)
      nav.json              # Sidebar navigation labels

packages/backend/src/i18n/
  index.ts                  # Backend i18next initialization
  locales/
    en/
      errors.json           # API error messages
      auth.json             # Auth validation messages
      system.json           # System messages

packages/backend/extensions/{extension-id}/
  i18n/
    en.json                 # Extension strings (English)
    ar.json                 # Extension strings (Arabic) — optional
```

---

## Adding a New Language (Core System)

Example: adding Arabic (`ar`)

### Step 1 — Register the locale

Open `src/i18n/settings.ts` and add an entry:

```ts
export const supportedLocales = [
  { code: 'en', name: 'English', dir: 'ltr' as const },
  { code: 'ar', name: 'العربية', dir: 'rtl' as const },  // <-- add this
];
```

Set `dir: 'rtl'` for right-to-left languages (Arabic, Hebrew, Persian, Urdu).

### Step 2 — Create frontend translation files

Copy the English folder and translate:

```
src/i18n/locales/en/common.json  →  src/i18n/locales/ar/common.json
src/i18n/locales/en/nav.json     →  src/i18n/locales/ar/nav.json
```

Example `ar/common.json`:
```json
{
  "save": "حفظ",
  "cancel": "إلغاء",
  "delete": "حذف",
  "loading": "جاري التحميل...",
  "search.placeholder": "ابحث في سير العمل، المهارات...",
  "logout": "تسجيل الخروج"
}
```

You don't have to translate every key — missing keys automatically fall back to English.

### Step 3 — Register in the frontend initializer

Open `src/i18n/index.ts` and add your imports + resources:

```ts
// Add imports
import arCommon from './locales/ar/common.json';
import arNav from './locales/ar/nav.json';

// Add to resources
i18n.init({
  resources: {
    en: { common: enCommon, nav: enNav },
    ar: { common: arCommon, nav: arNav },   // <-- add this
  },
  // ...
});
```

### Step 4 — Create backend translation files (optional)

Copy and translate:

```
packages/backend/src/i18n/locales/en/errors.json  →  .../ar/errors.json
packages/backend/src/i18n/locales/en/auth.json    →  .../ar/auth.json
packages/backend/src/i18n/locales/en/system.json  →  .../ar/system.json
```

Then register in `packages/backend/src/i18n/index.ts`:

```ts
resources: {
  en: { errors: loadLocaleFile('en', 'errors'), ... },
  ar: { errors: loadLocaleFile('ar', 'errors'), ... },  // <-- add this
},
```

### Done

The language switcher in the header automatically shows all registered locales. Users can switch languages from there, and their preference is saved.

---

## Using Translations in Components

### Frontend (React components)

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('common');  // namespace: 'common' or 'nav'

  return (
    <div>
      <h1>{t('save')}</h1>                         {/* → "Save" or "حفظ" */}
      <p>{t('phase', { number: 9 })}</p>            {/* → "Phase 9 - beta" (interpolation) */}
    </div>
  );
}
```

### Backend (API routes)

```ts
import { getTranslator } from '../i18n/index.js';

fastify.get('/api/example', async (request, reply) => {
  const locale = (request as any).locale || 'en';
  const t = getTranslator(locale);

  return { message: t('errors:notFound') };  // → "Resource not found" or translated
});
```

---

## Translating an Extension

Extensions manage their own translations independently.

### Step 1 — Create an `i18n/` folder in your extension

```
extensions/my-extension/
  agentplayer.plugin.json
  index.js
  frontend/page.tsx
  i18n/                   # <-- add this folder
    en.json               # <-- required (English)
    ar.json               # <-- optional (any language)
```

### Step 2 — Write translation files

```json
// i18n/en.json
{
  "title": "My Extension",
  "settings.apiKey": "API Key",
  "settings.save": "Save Settings",
  "error.connection": "Connection failed",
  "status.connected": "Connected",
  "status.disconnected": "Disconnected"
}
```

```json
// i18n/ar.json
{
  "title": "الإضافة الخاصة بي",
  "settings.apiKey": "مفتاح API",
  "settings.save": "حفظ الإعدادات",
  "error.connection": "فشل الاتصال",
  "status.connected": "متصل",
  "status.disconnected": "غير متصل"
}
```

### Step 3 — Use in frontend (extension page)

```tsx
// frontend/page.tsx
'use client';
import { useExtensionTranslations } from '@/hooks/use-extension-translations';

export default function MyExtensionPage() {
  const { t, loaded } = useExtensionTranslations('my-extension');

  if (!loaded) return <div>Loading...</div>;

  return (
    <div>
      <h1>{t('title')}</h1>
      <span>{t('status.connected')}</span>
    </div>
  );
}
```

### Step 4 — Use in backend (extension routes)

```js
// index.js
export default {
  async register(api) {
    // Translations load automatically from i18n/ folder — no manual step needed

    api.registerRoutes(async (fastify) => {
      fastify.get('/status', async (request, reply) => {
        const locale = request.locale || 'en';
        return {
          message: api.t('status.connected', locale)  // → "متصل" or "Connected"
        };
      });
    });
  }
};
```

### Optional — Declare i18n in manifest

You can optionally declare i18n metadata in `agentplayer.plugin.json`:

```json
{
  "id": "my-extension",
  "name": "My Extension",
  "version": "1.0.0",
  "i18n": {
    "dir": "i18n",
    "defaultLocale": "en",
    "supportedLocales": ["en", "ar"]
  }
}
```

This is optional — the system auto-detects the `i18n/` folder regardless.

---

## Key Naming Conventions

| Pattern | Example | Use For |
|---------|---------|---------|
| Single word | `save`, `cancel`, `delete` | Common actions |
| Dot notation | `settings.apiKey` | Grouped by feature |
| Prefix by type | `error.connection` | Error messages |
| Prefix by type | `status.active` | Status labels |

- Use **camelCase** for multi-word keys: `sharedMemory`, `apiKey`
- Use **dot notation** for grouping: `brain.memory`, `settings.voice`
- Keep keys **descriptive but concise**

---

## How It Works

```
┌─────────────────────────────────────────────────┐
│                 i18next (core)                   │
│                                                  │
│  Namespace "common"     → Save, Cancel, Delete   │
│  Namespace "nav"        → Dashboard, Chat, Tasks │
│  Namespace "ext-slack"  → Send Message...        │  ← extension registered itself
│  Namespace "ext-email"  → Compose, Inbox...      │  ← another extension
│                                                  │
│  Each namespace has a copy per language:          │
│  en → { "save": "Save" }                        │
│  ar → { "save": "حفظ" }                         │
└─────────────────────────────────────────────────┘
```

- **Core translations** are loaded at startup (bundled with the app)
- **Extension translations** are loaded when the extension is enabled (backend) or when the user visits the extension page (frontend)
- **Fallback**: if a key is missing in the current language, English is returned
- **No key found at all**: the key itself is returned (e.g., `"settings.apiKey"`)

---

## RTL Support

For right-to-left languages (Arabic, Hebrew, etc.):

1. The system automatically sets `<html dir="rtl">` when an RTL locale is active
2. Use Tailwind CSS logical properties in your components:

| Instead of | Use |
|-----------|-----|
| `pl-4` / `pr-4` | `ps-4` / `pe-4` |
| `ml-4` / `mr-4` | `ms-4` / `me-4` |
| `border-l` / `border-r` | `border-s` / `border-e` |
| `text-left` / `text-right` | `text-start` / `text-end` |
| `left-0` / `right-0` | `start-0` / `end-0` |

Or use the `rtl:` variant for RTL-specific overrides:

```html
<div className="border-r rtl:border-r-0 rtl:border-l">
```

---

## Checklist for Contributors

- [ ] All user-facing strings use `t('key')` — no hardcoded text
- [ ] Keys exist in `en/*.json` (English is always the source of truth)
- [ ] Missing translations fall back gracefully to English
- [ ] Extension translations live in the extension's own `i18n/` folder
- [ ] RTL-sensitive layouts use logical CSS properties
