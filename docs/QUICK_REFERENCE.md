# Quick Reference Guide - Sarkari Khozo

A cheat sheet for common tasks and API usage.

## 🚀 Common Tasks

### Authentication

```typescript
// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Sign in
await supabase.auth.signInWithPassword({ email, password });

// Sign out
await supabase.auth.signOut();
```

### Database Queries

```typescript
// Select data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', 'value')
  .order('created_at', { ascending: false });

// Insert data
await supabase.from('table_name').insert({ field: 'value' });

// Update data
await supabase.from('table_name').update({ field: 'value' }).eq('id', id);

// Delete data
await supabase.from('table_name').delete().eq('id', id);
```

### Edge Functions

```typescript
// Call edge function
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { param1: 'value1', param2: 'value2' }
});
```

---

## 🎨 UI Components

### Button

```typescript
import { Button } from '@/components/ui/button';

<Button variant="default">Click me</Button>
<Button variant="outline" size="sm">Small</Button>
<Button disabled>Disabled</Button>
```

### Card

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Dialog

```typescript
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>Content here</DialogContent>
</Dialog>
```

### Toast

```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

toast({ title: "Success", description: "It worked!" });
toast({ variant: "destructive", title: "Error!" });
```

---

## 🔧 Custom Hooks

### useTranslation

```typescript
const { currentLanguage, changeLanguage, translateText } = useTranslation();

changeLanguage('hi');
const translated = await translateText('Hello', 'hi');
```

### useTextToSpeech

```typescript
const { speak, pause, resume, stop, isSpeaking } = useTextToSpeech();

await speak('Text to speak', 'hi');
pause();
resume();
stop();
```

### usePushNotifications

```typescript
const { subscribe, unsubscribe, isSubscribed } = usePushNotifications(userId);

await subscribe();    // Enable notifications
await unsubscribe();  // Disable notifications
```

---

## 🛠️ Utilities

### Class Names

```typescript
import { cn } from '@/lib/utils';

cn('base-class', isActive && 'active-class', 'other-class')
```

### Debounce

```typescript
import { debounce } from '@/lib/debounce';

const debouncedFn = debounce(myFunction, 500);
```

### Formatters

```typescript
import { formatViewCount } from '@/utils/formatViewCount';
import { formatIndianNumber, calculateRatio } from '@/utils/statsFormatting';

formatViewCount(1234);         // '1.2K'
formatIndianNumber(150000);    // '1.5 lakh'
calculateRatio(10000, 100);    // '100:1'
```

### Location Services

```typescript
import { 
  getAllStates, 
  getDistrictsByState, 
  reverseGeocode 
} from '@/lib/locationService';

const states = await getAllStates();
const districts = await getDistrictsByState('Karnataka');
const location = await reverseGeocode(12.9716, 77.5946);
```

---

## ⚡ Edge Functions

### process-query

```typescript
const { data } = await supabase.functions.invoke('process-query', {
  body: { query: 'SSC CGL 2025' }
});
// Returns: title, description, dates, eligibility, etc.
```

### translate-content

```typescript
const { data } = await supabase.functions.invoke('translate-content', {
  body: { text: 'Hello', targetLanguage: 'hi' }
});
// Returns: { translatedText: 'नमस्ते' }
```

### generate-eligibility-quiz

```typescript
// Generate quiz
const { data } = await supabase.functions.invoke('generate-eligibility-quiz', {
  body: { eligibility: 'Age: 18-27, Graduate' }
});

// Analyze answers
const { data } = await supabase.functions.invoke('generate-eligibility-quiz', {
  body: { 
    eligibility: 'Age: 18-27', 
    answers: { q1: 'Yes', q2: '25' },
    analyze: true 
  }
});
```

### check-local-availability

```typescript
const { data } = await supabase.functions.invoke('check-local-availability', {
  body: {
    programTitle: 'PM Kisan Yojana',
    state: 'Karnataka',
    district: 'Bangalore Urban'
  }
});
```

---

## 📱 Common Patterns

### Loading State

```typescript
const [isLoading, setIsLoading] = useState(false);

const fetchData = async () => {
  setIsLoading(true);
  try {
    const data = await api.fetch();
    setData(data);
  } catch (error) {
    handleError(error);
  } finally {
    setIsLoading(false);
  }
};
```

### Error Handling

```typescript
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
  return data;
} catch (error) {
  toast({
    variant: 'destructive',
    title: 'Error',
    description: error.message
  });
}
```

### Form Handling

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
});

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: '', email: '' }
});

const onSubmit = form.handleSubmit(async (values) => {
  // Handle form submission
});
```

---

## 🎯 TypeScript Types

### Common Types

```typescript
import type { Database } from '@/integrations/supabase/types';

type Story = Database['public']['Tables']['discovery_stories']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

type Language = 'en' | 'hi' | 'kn' | 'bh';

type ApplicationStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';
```

---

## 🔍 Debugging

### Console Logs

```typescript
// Development only
if (import.meta.env.DEV) {
  console.log('Debug:', data);
}
```

### Supabase Logs

```bash
# View edge function logs
supabase functions logs function-name --tail
```

### React DevTools

- Install React DevTools extension
- Inspect component props and state
- Profile performance

---

## 📊 Performance

### Memoization

```typescript
import { useMemo, useCallback } from 'react';

const sortedData = useMemo(() => data.sort(), [data]);
const handleClick = useCallback(() => {}, []);
```

### Lazy Loading

```typescript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));

<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

### Image Optimization

```typescript
<img src={url} loading="lazy" alt="Description" />
```

---

## 🔒 Security

### Environment Variables

```typescript
// ✅ Good
const apiKey = import.meta.env.VITE_API_KEY;

// ❌ Bad
const apiKey = 'hardcoded-key';
```

### Input Sanitization

```typescript
const sanitized = userInput.trim().substring(0, 1000);
```

---

## 📦 Build & Deploy

```bash
# Development
npm run dev

# Build
npm run build

# Preview
npm run preview

# Lint
npm run lint
```

---

## 🆘 Troubleshooting

### Common Issues

**Issue**: "Module not found"
```bash
npm install
```

**Issue**: "Database connection failed"
- Check `.env` file
- Verify Supabase URL and key

**Issue**: "Edge function timeout"
- Check function logs
- Increase timeout if needed
- Optimize query

**Issue**: "Type errors"
```bash
npm run build  # Check all type errors
```

---

## 📚 Resources

- [Main Documentation](./API_DOCUMENTATION.md)
- [Hooks API](./HOOKS_API.md)
- [Utilities API](./UTILITIES_API.md)
- [Components API](./COMPONENTS_API.md)
- [Edge Functions API](./EDGE_FUNCTIONS_API.md)

---

**Last Updated**: 2025-10-28

For more details, refer to the full documentation files.
