# Internationalization (i18n) Guide - Sarkari Khozo

Complete guide for using the new i18next-based internationalization system.

## 📚 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Translation Files](#translation-files)
4. [Usage Examples](#usage-examples)
5. [RTL Support](#rtl-support)
6. [Best Practices](#best-practices)
7. [Migration Guide](#migration-guide)

---

## Overview

Sarkari Khozo now uses **react-i18next** for internationalization, providing:

✅ **Namespace organization** - Organized translation keys  
✅ **Pluralization** - Automatic plural forms  
✅ **Date/number formatting** - Locale-aware formatting  
✅ **Fallback languages** - English fallback for missing translations  
✅ **Context-aware translations** - Different translations based on context  
✅ **RTL support** - Full right-to-left language support  
✅ **Performance** - Client-side caching, no runtime API calls for common phrases  

### Supported Languages

- 🇬🇧 **English** (`en`) - Default
- 🇮🇳 **हिंदी** (`hi`) - Hindi
- 🇮🇳 **ಕನ್ನಡ** (`kn`) - Kannada  
- 🇮🇳 **भोजपुरी** (`bh`) - Bhojpuri

---

## Quick Start

### 1. Using the Translation Hook

```typescript
import { useTranslation } from '@/hooks/useTranslation';

function MyComponent() {
  const { t, currentLanguage, changeLanguage } = useTranslation();
  
  return (
    <div>
      <h1>{t('app.name')}</h1>
      <p>{t('app.tagline')}</p>
      <button onClick={() => changeLanguage('hi')}>
        Switch to Hindi
      </button>
    </div>
  );
}
```

### 2. Using the Trans Component

```typescript
import { Trans } from '@/i18n/Trans';

function MyComponent() {
  return (
    <div>
      <Trans i18nKey="common.loading" />
      <Trans i18nKey="time.daysLeft" values={{ count: 5 }} />
    </div>
  );
}
```

### 3. Using the Simplified Hook

```typescript
import { useT } from '@/i18n/Trans';

function MyComponent() {
  const { common, auth, t } = useT();
  
  return (
    <div>
      <button>{common.save()}</button>
      <button>{auth.signIn()}</button>
      <span>{t('custom.key')}</span>
    </div>
  );
}
```

---

## Translation Files

Translation files are located in `/src/i18n/locales/`

### File Structure

```
src/i18n/
├── config.ts           # i18next configuration
├── locales/
│   ├── en.json        # English translations
│   ├── hi.json        # Hindi translations
│   ├── kn.json        # Kannada translations
│   └── bh.json        # Bhojpuri translations
├── Trans.tsx          # Translation components
└── LanguageSwitcher.tsx  # Language switcher UI
```

### Translation Key Structure

```json
{
  "app": {
    "name": "Sarkari Khozo",
    "tagline": "Find Government Schemes, Exams & Jobs"
  },
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "save": "Save"
  },
  "auth": {
    "signIn": "Sign In",
    "signOut": "Sign Out"
  }
}
```

### Adding New Translation Keys

1. Add to `en.json` (source of truth)
2. Add translations to other language files
3. Use in code with dot notation: `t('common.loading')`

---

## Usage Examples

### Basic Translation

```typescript
const { t } = useTranslation();

// Simple key
<h1>{t('app.name')}</h1>

// Nested key
<span>{t('common.loading')}</span>

// With fallback
<p>{t('custom.key', { defaultValue: 'Fallback text' })}</p>
```

### Variables/Interpolation

```typescript
// In translation file
{
  "greeting": "Hello, {{name}}!",
  "itemCount": "You have {{count}} items"
}

// In component
<p>{t('greeting', { name: 'John' })}</p>
<p>{t('itemCount', { count: 5 })}</p>
```

### Pluralization

```typescript
// In translation file
{
  "daysLeft": "{{count}} day left",
  "daysLeft_plural": "{{count}} days left"
}

// In component
<p>{t('time.daysLeft', { count: 1 })}</p>  // "1 day left"
<p>{t('time.daysLeft', { count: 5 })}</p>  // "5 days left"
```

### Dynamic Keys

```typescript
const category = 'students';
<span>{t(`categories.${category}`)}</span>
```

### List of Items

```typescript
{
  "features": {
    "0": "Feature 1",
    "1": "Feature 2",
    "2": "Feature 3"
  }
}

// In component
<ul>
  {[0, 1, 2].map(i => (
    <li key={i}>{t(`features.${i}`)}</li>
  ))}
</ul>
```

---

## RTL Support

### Automatic RTL Detection

The system automatically sets document direction based on language:

```typescript
const { direction, isRTL } = useTranslation();

// direction = 'ltr' or 'rtl'
// isRTL = true/false
```

### CSS Classes for RTL

Use logical properties for margin/padding:

```typescript
// ❌ Don't use directional properties
<div className="ml-4 mr-2">

// ✅ Use logical properties
<div className="ms-4 me-2">
```

Available classes:
- `ms-*` / `me-*` - margin-inline-start/end
- `ps-*` / `pe-*` - padding-inline-start/end
- `text-start` / `text-end` - text alignment

### Flipping Icons for RTL

```typescript
// Icons that should flip in RTL
<ChevronRight className="flip-rtl" />
<ArrowRight className="flip-rtl" />
```

### RTL-Aware Components

```typescript
// Conditional rendering based on direction
const { isRTL } = useTranslation();

<div className={cn(
  'flex items-center gap-2',
  isRTL && 'flex-row-reverse'
)}>
  <Icon />
  <Text />
</div>
```

---

## Best Practices

### 1. Use Namespaces

Group related translations:

```typescript
// ✅ Good
t('auth.signIn')
t('auth.signOut')
t('auth.signUp')

// ❌ Bad
t('signIn')
t('signOut')
t('signUp')
```

### 2. Keep Keys Semantic

```typescript
// ✅ Good - semantic
t('errors.networkError')
t('actions.submitForm')

// ❌ Bad - implementation detail
t('button1')
t('text_header')
```

### 3. Provide Fallbacks

```typescript
// ✅ Good
t('newFeature.title', { defaultValue: 'New Feature' })

// ❌ Bad - shows key if translation missing
t('newFeature.title')
```

### 4. Don't Hardcode Strings

```typescript
// ❌ Bad
<button>Click here</button>

// ✅ Good
<button>{t('common.clickHere')}</button>
```

### 5. Use Component for Complex Translations

```typescript
// ✅ Good - readable
<Trans i18nKey="welcome.message" values={{ name: userName }} />

// ❌ Bad - hard to read
<span>{t('welcome.message', { name: userName })}</span>
```

---

## Migration Guide

### Migrating from Old System

The old `translateText` function still works for AI-powered translations. Use i18next for:

✅ **Static UI text** - Buttons, labels, headers  
✅ **Common phrases** - Loading, errors, success messages  
✅ **Navigation** - Menu items, routes  

Use AI translation (`translateText`) for:

✅ **Dynamic content** - User-generated content  
✅ **API responses** - Backend data  
✅ **Long-form text** - Descriptions, articles  

### Example Migration

**Before:**
```typescript
<button>Save</button>
<span>Loading...</span>
```

**After:**
```typescript
import { useT } from '@/i18n/Trans';

const { common } = useT();

<button>{common.save()}</button>
<span>{common.loading()}</span>
```

### Mixing Both Systems

```typescript
// Static UI text with i18next
const { t } = useTranslation();
<h1>{t('app.name')}</h1>

// Dynamic content with AI translation
const { translateText } = useTranslation();
const translated = await translateText(userContent, 'hi');
```

---

## Adding New Languages

### 1. Create Translation File

Create `/src/i18n/locales/[lang].json`:

```json
{
  "app": {
    "name": "Your Translation"
  }
}
```

### 2. Update Config

Add to `/src/i18n/config.ts`:

```typescript
import newLangTranslations from './locales/new-lang.json';

const resources = {
  // ... existing
  'new-lang': {
    translation: newLangTranslations,
  },
};
```

### 3. Add RTL Support (if needed)

Update `getLanguageDirection` in `/src/i18n/config.ts`:

```typescript
const rtlLanguages = ['ar', 'ur', 'he', 'fa', 'new-rtl-lang'];
```

---

## Language Switcher

### Using the Built-in Component

```typescript
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher';

<Header>
  <LanguageSwitcher />
</Header>
```

### Custom Language Switcher

```typescript
import { useTranslation } from '@/hooks/useTranslation';

function CustomSwitcher() {
  const { changeLanguage, currentLanguage } = useTranslation();
  
  return (
    <select 
      value={currentLanguage} 
      onChange={(e) => changeLanguage(e.target.value)}
    >
      <option value="en">English</option>
      <option value="hi">हिंदी</option>
      <option value="kn">ಕನ್ನಡ</option>
      <option value="bh">भोजपुरी</option>
    </select>
  );
}
```

---

## Testing Translations

### Visual Testing

1. Switch language using language switcher
2. Verify all text updates
3. Check RTL layout (when RTL languages added)
4. Test on mobile and desktop

### Code Testing

```typescript
import { renderWithi18n } from '@/test-utils';

test('renders translated text', () => {
  const { getByText } = renderWithi18n(
    <MyComponent />,
    { lng: 'hi' }
  );
  
  expect(getByText('हिंदी text')).toBeInTheDocument();
});
```

---

## Performance

### Automatic Caching

i18next automatically caches translations in memory. No need for manual caching.

### Bundle Size

Each language file adds ~10-20KB to bundle. Languages are not code-split by default but can be lazy-loaded:

```typescript
// Lazy load languages
i18n.use(HttpBackend).init({
  backend: {
    loadPath: '/locales/{{lng}}.json',
  },
});
```

---

## Debugging

### Enable Debug Mode

In development, debug mode is automatically enabled:

```typescript
// See translation lookups in console
i18n.init({
  debug: import.meta.env.DEV,
});
```

### Missing Translation Handler

```typescript
i18n.on('missingKey', (lngs, namespace, key) => {
  console.warn(`Missing translation: ${key}`);
});
```

---

## Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [RTL CSS Guide](https://rtlcss.com/)
- [ICU Message Format](https://unicode-org.github.io/icu/userguide/format_parse/messages/)

---

## Support

For questions about i18n:
1. Check this guide
2. Review translation files
3. Test with language switcher
4. Contact development team

**Last Updated**: 2025-10-28
