# Custom Hooks API Reference

This document provides comprehensive documentation for all custom React hooks in the FormVerse application.

## Table of Contents

1. [useTranslation](#usetranslation)
2. [useTextToSpeech](#usetexttospeech)
3. [useAudioNewsBulletin](#useaudionewsbulletin)
4. [usePushNotifications](#usepushnotifications)
5. [useRotatingPlaceholder](#userotatingplaceholder)
6. [useViewTracking](#useviewtracking)
7. [useIsMobile](#useismobile)
8. [useMediaQuery](#usemediaquery)
9. [useToast](#usetoast)

---

## useTranslation

Multi-language translation hook with caching support.

### Import

```typescript
import { useTranslation } from '@/hooks/useTranslation';
```

### Usage

```typescript
const {
  currentLanguage,
  changeLanguage,
  translateText,
  isTranslating,
  getLanguageLabel
} = useTranslation();
```

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `currentLanguage` | `'en' \| 'hi' \| 'kn' \| 'bh'` | Currently selected language |
| `changeLanguage` | `(lang: Language) => void` | Function to change language |
| `translateText` | `(text: string, targetLang: Language) => Promise<string>` | Translate text to target language |
| `isTranslating` | `boolean` | Translation in progress indicator |
| `getLanguageLabel` | `(lang: Language) => string` | Get native language name |

### Supported Languages

- `en` - English
- `hi` - हिंदी (Hindi)
- `kn` - ಕನ್ನಡ (Kannada)
- `bh` - भोजपुरी (Bhojpuri)

### Features

- ✅ Automatic caching of translations
- ✅ LocalStorage persistence
- ✅ Fallback to original text on error
- ✅ Supabase edge function integration

### Example: Change Language

```typescript
const { changeLanguage, currentLanguage } = useTranslation();

// Change to Hindi
changeLanguage('hi');

console.log(currentLanguage); // 'hi'
```

### Example: Translate Text

```typescript
const { translateText } = useTranslation();

const translatedText = await translateText(
  'Welcome to FormVerse',
  'hi'
);

console.log(translatedText); // 'FormVerse में आपका स्वागत है'
```

### Example: Get Language Label

```typescript
const { getLanguageLabel } = useTranslation();

console.log(getLanguageLabel('hi')); // 'हिंदी'
console.log(getLanguageLabel('kn')); // 'ಕನ್ನಡ'
```

### Caching Mechanism

The hook uses an in-memory cache with keys based on the first 100 characters of the text:

```typescript
// Cache structure
{
  "Welcome to FormVerse...": {
    "hi": "FormVerse में आपका स्वागत है",
    "kn": "ಫಾರ್ಮ್‌ವರ್ಸ್‌ಗೆ ಸ್ವಾಗತ"
  }
}
```

---

## useTextToSpeech

Web Speech API wrapper for text-to-speech functionality.

### Import

```typescript
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
```

### Usage

```typescript
const {
  speak,
  pause,
  resume,
  stop,
  isSpeaking,
  isPaused,
  currentSection,
  isSupported
} = useTextToSpeech();
```

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `speak` | `(text: string, lang?: Language, sectionId?: string) => Promise<void>` | Start speaking text |
| `pause` | `() => void` | Pause current speech |
| `resume` | `() => void` | Resume paused speech |
| `stop` | `() => void` | Stop speech and reset |
| `isSpeaking` | `boolean` | Whether currently speaking |
| `isPaused` | `boolean` | Whether speech is paused |
| `currentSection` | `string \| null` | ID of currently speaking section |
| `isSupported` | `boolean` | Browser support status |

### Features

- ✅ Multi-language voice support
- ✅ Automatic text chunking for long content (>4000 chars)
- ✅ Voice selection based on language
- ✅ Pause/resume capability
- ✅ Section tracking

### Example: Speak Text

```typescript
const { speak, isSupported } = useTextToSpeech();

if (isSupported) {
  await speak(
    'This is a test message',
    'en',
    'section-1'
  );
}
```

### Example: Full Control

```typescript
const { speak, pause, resume, stop, isSpeaking } = useTextToSpeech();

// Start speaking
await speak('Long text content here...', 'hi');

// Pause after 2 seconds
setTimeout(() => {
  if (isSpeaking) {
    pause();
  }
}, 2000);

// Resume after another 2 seconds
setTimeout(() => {
  resume();
}, 4000);

// Stop completely
setTimeout(() => {
  stop();
}, 10000);
```

### Voice Selection

The hook automatically selects appropriate voices:

```typescript
// Language mapping
'en' → 'en-IN' voice
'hi' → 'hi-IN' voice
'kn' → 'kn-IN' voice
```

### Speech Settings

Default speech parameters:
- **Rate**: 0.9 (slightly slower than normal)
- **Pitch**: 1.0 (normal)
- **Volume**: 1.0 (maximum)

---

## useAudioNewsBulletin

Hook for fetching and managing audio news bulletins.

### Import

```typescript
import { useAudioNewsBulletin } from '@/hooks/useAudioNewsBulletin';
```

### Usage

```typescript
const {
  bulletin,
  isLoading,
  error,
  trackView,
  refetch
} = useAudioNewsBulletin('hi'); // language parameter
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `language` | `string` | `'hi'` | Language code for bulletin |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `bulletin` | `AudioBulletin \| null` | Current bulletin data |
| `isLoading` | `boolean` | Loading state |
| `error` | `string \| null` | Error message if any |
| `trackView` | `(bulletinId: string) => Promise<void>` | Track bulletin view |
| `refetch` | `() => Promise<void>` | Manually refetch bulletin |

### AudioBulletin Type

```typescript
interface AudioBulletin {
  id: string;
  title: string;
  duration_seconds: number;
  audio_url?: string;
  audio_base64?: string;
  story_ids: string[];
  language: string;
  generated_at: string;
  view_count: number;
  audio_news_scripts: AudioScript[];
}

interface AudioScript {
  id: string;
  story_order: number;
  hindi_script: string;
  story_id: string;
  discovery_stories?: {
    headline: string;
    category: string;
  };
}
```

### Features

- ✅ Real-time updates via Supabase subscriptions
- ✅ Automatic refetch on new bulletins
- ✅ View tracking
- ✅ Script details with story information

### Example: Basic Usage

```typescript
const { bulletin, isLoading, error } = useAudioNewsBulletin('hi');

if (isLoading) return <div>Loading...</div>;
if (error) return <div>Error: {error}</div>;
if (!bulletin) return <div>No bulletin available</div>;

return (
  <div>
    <h2>{bulletin.title}</h2>
    <audio src={bulletin.audio_url} controls />
    <p>Duration: {bulletin.duration_seconds}s</p>
    <p>Views: {bulletin.view_count}</p>
  </div>
);
```

### Example: Track View

```typescript
const { bulletin, trackView } = useAudioNewsBulletin('hi');

useEffect(() => {
  if (bulletin) {
    trackView(bulletin.id);
  }
}, [bulletin]);
```

### Example: Bhojpuri Bulletin

```typescript
const { bulletin } = useAudioNewsBulletin('bh');

// Fetches Bhojpuri language bulletin
```

---

## usePushNotifications

Manage web push notifications subscription.

### Import

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';
```

### Usage

```typescript
const {
  permission,
  isSubscribed,
  isLoading,
  subscribe,
  unsubscribe,
  requestPermission
} = usePushNotifications(userId);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | `string \| undefined` | Current user's ID |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `permission` | `NotificationPermission` | Current permission status |
| `isSubscribed` | `boolean` | Subscription status |
| `isLoading` | `boolean` | Loading state |
| `subscribe` | `() => Promise<void>` | Subscribe to notifications |
| `unsubscribe` | `() => Promise<void>` | Unsubscribe from notifications |
| `requestPermission` | `() => Promise<boolean>` | Request notification permission |

### NotificationPermission Values

- `'default'` - Permission not yet requested
- `'granted'` - User granted permission
- `'denied'` - User denied permission

### Features

- ✅ Service Worker registration
- ✅ VAPID key integration
- ✅ Subscription persistence in database
- ✅ Automatic permission handling

### Example: Subscribe to Notifications

```typescript
const { subscribe, permission, isSubscribed } = usePushNotifications(userId);

if (permission === 'default') {
  // Request permission and subscribe
  await subscribe();
} else if (permission === 'granted' && !isSubscribed) {
  // Already has permission, just subscribe
  await subscribe();
}
```

### Example: Unsubscribe

```typescript
const { unsubscribe, isSubscribed } = usePushNotifications(userId);

if (isSubscribed) {
  await unsubscribe();
}
```

### Example: Check Permission Status

```typescript
const { permission } = usePushNotifications(userId);

if (permission === 'denied') {
  return <p>Please enable notifications in browser settings</p>;
}
```

### Requirements

1. **Service Worker**: Must be registered at `/sw.js`
2. **VAPID Key**: Set `VITE_VAPID_PUBLIC_KEY` environment variable
3. **HTTPS**: Required for push notifications (except localhost)

---

## useRotatingPlaceholder

Rotating placeholder text for search inputs.

### Import

```typescript
import { useRotatingPlaceholder } from '@/hooks/useRotatingPlaceholder';
```

### Usage

```typescript
const placeholder = useRotatingPlaceholder(3000); // interval in ms
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `interval` | `number` | `3000` | Rotation interval in milliseconds |

### Return Value

Returns a string with rotating example text.

### Placeholder Examples

The hook rotates through these examples:
- SSC CGL 2025
- PM Kisan Yojana
- Startup India Seed Fund
- UPSC Prelims
- RRB NTPC 2025
- IBPS PO Exam
- Gujarat Startup Grant
- PM SVANidhi Scheme

### Example

```typescript
const SearchComponent = () => {
  const placeholder = useRotatingPlaceholder(3000);
  
  return (
    <Input
      type="text"
      placeholder={placeholder}
    />
  );
};
```

### Example: Custom Interval

```typescript
// Rotate every 5 seconds
const placeholder = useRotatingPlaceholder(5000);
```

---

## useViewTracking

Track story views with hover detection.

### Import

```typescript
import { useViewTracking } from '@/hooks/useViewTracking';
```

### Usage

```typescript
const {
  handleMouseEnter,
  handleMouseLeave,
  trackView,
  trackClick,
  hasTrackedView
} = useViewTracking({
  storyId: 'story-123',
  enabled: true,
  timeThreshold: 3
});
```

### Parameters

```typescript
interface UseViewTrackingProps {
  storyId: string;        // Required: Story ID to track
  enabled?: boolean;      // Optional: Enable tracking (default: true)
  timeThreshold?: number; // Optional: Hover time in seconds (default: 3)
}
```

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `handleMouseEnter` | `() => void` | Start tracking on hover |
| `handleMouseLeave` | `() => void` | Stop tracking on hover end |
| `trackView` | `() => Promise<void>` | Manually track view |
| `trackClick` | `() => Promise<void>` | Track click interaction |
| `hasTrackedView` | `boolean` | Whether view has been tracked |

### Features

- ✅ Hover-based view tracking
- ✅ Configurable time threshold
- ✅ Session-based deduplication
- ✅ Automatic read duration calculation
- ✅ Click tracking

### Example: Basic Usage

```typescript
const StoryCard = ({ storyId }) => {
  const {
    handleMouseEnter,
    handleMouseLeave,
    trackClick
  } = useViewTracking({
    storyId,
    timeThreshold: 3
  });
  
  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={trackClick}
    >
      {/* Story content */}
    </div>
  );
};
```

### Example: Manual Tracking

```typescript
const { trackView } = useViewTracking({
  storyId: 'story-123',
  enabled: true
});

// Track view when component mounts
useEffect(() => {
  trackView();
}, []);
```

### Example: Disable Tracking

```typescript
const tracking = useViewTracking({
  storyId: 'story-123',
  enabled: false // Tracking disabled
});
```

### Interaction Types

The hook tracks two types of interactions:
1. **View**: Hover for specified time threshold
2. **Click**: User clicks on story link

---

## useIsMobile

Detect mobile viewport size.

### Import

```typescript
import { useIsMobile } from '@/hooks/use-mobile';
```

### Usage

```typescript
const isMobile = useIsMobile();
```

### Return Value

Returns `boolean` - `true` if viewport width < 768px

### Example

```typescript
const MyComponent = () => {
  const isMobile = useIsMobile();
  
  return (
    <div>
      {isMobile ? (
        <MobileLayout />
      ) : (
        <DesktopLayout />
      )}
    </div>
  );
};
```

### Breakpoint

- **Mobile**: `< 768px`
- **Desktop**: `≥ 768px`

---

## useMediaQuery

Custom media query hook.

### Import

```typescript
import { useMediaQuery } from '@/hooks/use-mobile';
```

### Usage

```typescript
const matches = useMediaQuery('(min-width: 1024px)');
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | `string` | CSS media query string |

### Return Value

Returns `boolean` - Whether query matches

### Examples

```typescript
// Tablet and above
const isTablet = useMediaQuery('(min-width: 768px)');

// Dark mode preference
const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

// Landscape orientation
const isLandscape = useMediaQuery('(orientation: landscape)');

// High resolution
const isRetina = useMediaQuery('(min-resolution: 2dppx)');
```

---

## useToast

Toast notification hook (from shadcn/ui).

### Import

```typescript
import { useToast } from '@/hooks/use-toast';
```

### Usage

```typescript
const { toast } = useToast();

toast({
  title: 'Success',
  description: 'Your changes have been saved.',
});
```

### Toast Options

```typescript
interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number; // milliseconds
  action?: React.ReactNode;
}
```

### Examples

#### Success Toast

```typescript
toast({
  title: 'Success',
  description: 'Operation completed successfully.',
});
```

#### Error Toast

```typescript
toast({
  variant: 'destructive',
  title: 'Error',
  description: 'Something went wrong. Please try again.',
});
```

#### Toast with Action

```typescript
toast({
  title: 'Update Available',
  description: 'A new version is available.',
  action: (
    <Button onClick={handleUpdate}>
      Update Now
    </Button>
  ),
});
```

#### Custom Duration

```typescript
toast({
  title: 'Quick Message',
  duration: 2000, // 2 seconds
});
```

---

## Best Practices

### 1. Cleanup Subscriptions

Always cleanup subscriptions in useEffect:

```typescript
useEffect(() => {
  const channel = supabase.channel('my-channel').subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### 2. Error Handling

Handle errors gracefully:

```typescript
const { error } = useAudioNewsBulletin('hi');

if (error) {
  toast({
    variant: 'destructive',
    title: 'Error',
    description: error
  });
}
```

### 3. Loading States

Always show loading indicators:

```typescript
const { isLoading } = useAudioNewsBulletin('hi');

if (isLoading) {
  return <Spinner />;
}
```

### 4. Memoization

Memoize callback dependencies:

```typescript
const { translateText } = useTranslation();

const handleTranslate = useCallback(async (text: string) => {
  const result = await translateText(text, 'hi');
  console.log(result);
}, [translateText]);
```

---

## TypeScript Support

All hooks are fully typed with TypeScript. Import types as needed:

```typescript
import type { Language } from '@/hooks/useTranslation';
import type { AudioBulletin } from '@/hooks/useAudioNewsBulletin';
```

---

## Performance Considerations

1. **useTranslation**: Caches translations to reduce API calls
2. **useTextToSpeech**: Chunks long text automatically
3. **useViewTracking**: Uses sessionStorage to prevent duplicate tracking
4. **useRotatingPlaceholder**: Cleans up interval on unmount

---

## Browser Compatibility

| Hook | Requirements |
|------|-------------|
| `useTextToSpeech` | Web Speech API (Chrome, Edge, Safari) |
| `usePushNotifications` | Service Workers, Push API, HTTPS |
| `useMediaQuery` | matchMedia API (All modern browsers) |
| Other hooks | Modern browsers with ES6+ support |

---

## Support

For issues or questions about hooks:
1. Check inline code documentation
2. Review examples in this guide
3. Contact the development team
