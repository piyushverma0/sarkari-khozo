# API Documentation - FormVerse

Welcome to the comprehensive API documentation for the FormVerse application. This guide covers all public APIs, hooks, utilities, components, and Supabase edge functions.

## Table of Contents

1. [Overview](#overview)
2. [Custom Hooks](#custom-hooks)
3. [Utility Functions](#utility-functions)
4. [React Components](#react-components)
5. [Supabase Edge Functions](#supabase-edge-functions)
6. [Integration APIs](#integration-apis)

---

## Overview

FormVerse is a React-based application built with:
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **State Management**: TanStack Query
- **Routing**: React Router v6

### Key Features
- Multi-language support (English, Hindi, Kannada, Bhojpuri)
- Text-to-speech functionality
- Push notifications
- Location-based services
- Audio news bulletins
- Government scheme discovery
- Application tracking

---

## Quick Links

- [Custom Hooks Documentation](./HOOKS_API.md)
- [Utilities Documentation](./UTILITIES_API.md)
- [Components Documentation](./COMPONENTS_API.md)
- [Edge Functions Documentation](./EDGE_FUNCTIONS_API.md)

---

## Architecture Overview

```
src/
├── components/        # React components
│   ├── ui/           # shadcn/ui components
│   ├── auth/         # Authentication components
│   └── discover/     # Discovery feed components
├── hooks/            # Custom React hooks
├── lib/              # Core utility libraries
├── utils/            # Helper utilities
├── pages/            # Route page components
└── integrations/     # Third-party integrations
    └── supabase/     # Supabase client & types

supabase/
└── functions/        # Edge Functions (Deno)
    ├── _shared/      # Shared utilities
    └── [function]/   # Individual functions
```

---

## Environment Variables

### Required Variables

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Push Notifications
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
```

### Optional Variables

```env
# Feature Flags
VITE_ENABLE_AUDIO_NEWS=true
VITE_ENABLE_PUSH_NOTIFICATIONS=true
```

---

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## Authentication

The application uses Supabase Auth for user authentication.

### Example: Get Current User

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data: { user } } = await supabase.auth.getUser();
console.log(user);
```

### Example: Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

### Example: Sign Out

```typescript
const { error } = await supabase.auth.signOut();
```

---

## Database Access

### Example: Query Data

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase
  .from('discovery_stories')
  .select('*')
  .eq('is_active', true)
  .order('created_at', { ascending: false })
  .limit(10);
```

### Example: Insert Data

```typescript
const { data, error } = await supabase
  .from('profiles')
  .insert({
    user_id: userId,
    saved_state: 'Karnataka',
    saved_district: 'Bangalore'
  });
```

### Example: Update Data

```typescript
const { error } = await supabase
  .from('profiles')
  .update({ saved_state: 'Gujarat' })
  .eq('user_id', userId);
```

---

## Realtime Subscriptions

### Example: Subscribe to Changes

```typescript
const channel = supabase
  .channel('audio-bulletins')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'audio_news_bulletins'
    },
    (payload) => {
      console.log('New bulletin:', payload);
    }
  )
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(channel);
};
```

---

## Error Handling

### Best Practices

1. **Always check for errors** in Supabase responses
2. **Use try-catch blocks** for async operations
3. **Display user-friendly messages** using toast notifications
4. **Log errors** for debugging

### Example

```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

try {
  const { data, error } = await supabase
    .from('table_name')
    .select('*');
  
  if (error) throw error;
  
  // Process data
  console.log(data);
} catch (error) {
  console.error('Error:', error);
  toast({
    variant: 'destructive',
    title: 'Error',
    description: error instanceof Error ? error.message : 'Unknown error'
  });
}
```

---

## TypeScript Support

All APIs are fully typed. Import types from:

```typescript
import type { Database } from '@/integrations/supabase/types';

// Use specific table types
type Story = Database['public']['Tables']['discovery_stories']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
```

---

## Testing

### Running Tests

```bash
npm test
```

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { formatViewCount } from '@/utils/formatViewCount';

describe('formatViewCount', () => {
  it('formats numbers correctly', () => {
    expect(formatViewCount(500)).toBe('500');
    expect(formatViewCount(1500)).toBe('1.5K');
    expect(formatViewCount(1000000)).toBe('1M');
  });
});
```

---

## Support

For issues or questions:
- Check the detailed documentation in the `/docs` directory
- Review the inline code comments
- Contact the development team

---

## License

This project is proprietary and confidential.
