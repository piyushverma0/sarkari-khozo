# React Components API Reference

This document provides comprehensive documentation for key React components in the Sarkari Khozo application.

## Table of Contents

1. [Overview](#overview)
2. [Layout Components](#layout-components)
   - [Header](#header)
   - [ErrorBoundary](#errorboundary)
3. [Feature Components](#feature-components)
   - [SearchAutocomplete](#searchautocomplete)
   - [EligibilityQuiz](#eligibilityquiz)
   - [LanguageToolbar](#languagetoolbar)
   - [LocalCheckPanel](#localcheckpanel)
   - [AudioNewsBanner](#audionewsbanner)
4. [Application Components](#application-components)
   - [ApplicationCard](#applicationcard)
   - [ApplicationsDashboard](#applicationsdashboard)
   - [SavedApplicationCard](#savedapplicationcard)
5. [Discovery Components](#discovery-components)
   - [StoryCard](#storycard)
   - [DiscoverFilters](#discoverfilters)
   - [EngagementMetrics](#engagementmetrics)
6. [UI Components](#ui-components)
   - [Button](#button)
   - [Card](#card)
   - [Dialog](#dialog)
   - [Toast](#toast)
7. [Best Practices](#best-practices)

---

## Overview

All components are built with:
- **TypeScript**: Full type safety
- **shadcn/ui**: Accessible, customizable UI components
- **Tailwind CSS**: Utility-first styling
- **React 18**: Latest React features

### Component Patterns

```typescript
// Standard component pattern
interface MyComponentProps {
  prop1: string;
  prop2?: number;
  onAction?: () => void;
}

export const MyComponent = ({ prop1, prop2, onAction }: MyComponentProps) => {
  // Implementation
};
```

---

## Layout Components

### Header

Application header with authentication and navigation.

#### Location

```
/src/components/Header.tsx
```

#### Props

None (self-contained)

#### Features

- ✅ User authentication display
- ✅ Navigation menu
- ✅ Notification center
- ✅ Responsive design

#### Example

```typescript
import Header from '@/components/Header';

function App() {
  return (
    <>
      <Header />
      <main>{/* Content */}</main>
    </>
  );
}
```

#### User States

**Logged Out**
- Shows "Sign In" button
- Redirects to `/auth` on click

**Logged In**
- Shows user avatar
- Displays "Discover" button
- Shows "My Applications" button (desktop)
- Dropdown menu with sign out option

---

### ErrorBoundary

Catches and displays React errors gracefully.

#### Location

```
/src/components/ErrorBoundary.tsx
```

#### Props

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
```

#### Example

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary fallback={<div>Something went wrong</div>}>
  <YourComponent />
</ErrorBoundary>
```

---

## Feature Components

### SearchAutocomplete

Autocomplete search input with suggestions.

#### Location

```
/src/components/SearchAutocomplete.tsx
```

#### Props

```typescript
interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}
```

#### Built-in Suggestions

- SSC CGL 2024 Exam
- UPSC Civil Services Prelims
- RRB NTPC 2025
- IBPS PO 2025
- PM Kisan Yojana
- Startup India Seed Fund
- Gujarat Startup Grant
- And more...

#### Features

- ✅ Real-time filtering
- ✅ Keyboard navigation
- ✅ Click outside to close
- ✅ Auto-focus on type

#### Example

```typescript
import { SearchAutocomplete } from '@/components/SearchAutocomplete';

const [query, setQuery] = useState('');

<SearchAutocomplete
  value={query}
  onChange={setQuery}
  onSelect={(value) => {
    setQuery(value);
    handleSearch(value);
  }}
  placeholder="Search for exams, jobs, or schemes..."
/>
```

#### Styling

```typescript
<SearchAutocomplete
  className="w-full max-w-2xl"
  placeholder="Custom placeholder"
  disabled={isLoading}
/>
```

---

### EligibilityQuiz

Interactive quiz to check user eligibility.

#### Location

```
/src/components/EligibilityQuiz.tsx
```

#### Props

```typescript
interface EligibilityQuizProps {
  eligibility: string;  // Eligibility criteria text
  onClose: () => void;  // Close callback
}
```

#### Question Types

1. **Yes/No**: Binary questions
2. **Multiple Choice**: 2-5 options
3. **Text**: Free-form input

#### Features

- ✅ AI-generated questions
- ✅ Progress tracking
- ✅ Eligibility calculation
- ✅ Detailed results

#### Example

```typescript
import { EligibilityQuiz } from '@/components/EligibilityQuiz';

const [showQuiz, setShowQuiz] = useState(false);

// Show quiz
{showQuiz && (
  <EligibilityQuiz
    eligibility="Age: 18-27 years, Education: Graduate, Nationality: Indian"
    onClose={() => setShowQuiz(false)}
  />
)}
```

#### Result Calculation

- **Eligible**: ≥70% positive answers
- **Partially Eligible**: 40-69%
- **Not Eligible**: <40%

#### UI States

1. **Loading**: Generating questions
2. **Questions**: Answering quiz
3. **Results**: Showing eligibility verdict

---

### LanguageToolbar

Language selection and audio playback controls.

#### Location

```
/src/components/LanguageToolbar.tsx
```

#### Props

```typescript
interface LanguageToolbarProps {
  currentLanguage: 'en' | 'hi' | 'kn' | 'bh';
  onLanguageChange: (lang: Language) => void;
  isPlaying: boolean;
  isPaused: boolean;
  isGeneratingSummary: boolean;
  onPlayFullSummary: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  getLanguageLabel: (lang: Language) => string;
}
```

#### Features

- ✅ Language switcher
- ✅ Audio playback controls
- ✅ Speed adjustment
- ✅ Loading states

#### Example

```typescript
import { LanguageToolbar } from '@/components/LanguageToolbar';
import { useTranslation } from '@/hooks/useTranslation';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

const {
  currentLanguage,
  changeLanguage,
  getLanguageLabel
} = useTranslation();

const {
  speak,
  pause,
  resume,
  stop,
  isSpeaking,
  isPaused
} = useTextToSpeech();

<LanguageToolbar
  currentLanguage={currentLanguage}
  onLanguageChange={changeLanguage}
  isPlaying={isSpeaking}
  isPaused={isPaused}
  isGeneratingSummary={false}
  onPlayFullSummary={() => speak(content, currentLanguage)}
  onPause={pause}
  onResume={resume}
  onStop={stop}
  playbackSpeed={1.0}
  onSpeedChange={(speed) => console.log(speed)}
  getLanguageLabel={getLanguageLabel}
/>
```

#### Supported Languages

| Code | Name | Display |
|------|------|---------|
| `en` | English | English |
| `hi` | Hindi | हिंदी |
| `kn` | Kannada | ಕನ್ನಡ |
| `bh` | Bhojpuri | भोजपुरी |

---

### LocalCheckPanel

Check program availability in user's location.

#### Location

```
/src/components/LocalCheckPanel.tsx
```

#### Props

```typescript
interface LocalCheckPanelProps {
  application: {
    id?: string;
    title: string;
    category?: string;
    local_availability_cache?: {
      results: LocalInitiativeResult[];
      state: string;
      district?: string;
      cachedAt: string;
    };
  };
  userId?: string;
}
```

#### Features

- ✅ Saved location integration
- ✅ Result caching
- ✅ Hierarchical location (State → District → Block)
- ✅ Confidence indicators

#### Example

```typescript
import { LocalCheckPanel } from '@/components/LocalCheckPanel';

<LocalCheckPanel
  application={{
    id: 'app-123',
    title: 'PM Kisan Yojana',
    category: 'Farmers'
  }}
  userId={user?.id}
/>
```

#### Result Types

```typescript
interface LocalInitiativeResult {
  title: string;
  scope: 'district' | 'state' | 'national';
  mode: 'online' | 'csc' | 'office';
  deadline?: string;
  applyUrl?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
  };
  confidence: 'verified' | 'likely' | 'community';
  source: string;
  description?: string;
}
```

---

### AudioNewsBanner

Display and play audio news bulletins.

#### Location

```
/src/components/AudioNewsBanner.tsx
```

#### Props

None (self-contained with hooks)

#### Features

- ✅ Real-time bulletin updates
- ✅ Audio playback
- ✅ View tracking
- ✅ Script display
- ✅ Language selection (Hindi/Bhojpuri)

#### Example

```typescript
import { AudioNewsBanner } from '@/components/AudioNewsBanner';

// Automatically fetches and displays latest bulletin
<AudioNewsBanner />
```

#### Internal Structure

Uses `useAudioNewsBulletin` hook:

```typescript
const {
  bulletin,
  isLoading,
  error,
  trackView
} = useAudioNewsBulletin('hi'); // or 'bh'
```

---

## Application Components

### ApplicationCard

Display application/scheme card with details.

#### Location

```
/src/components/ApplicationCard.tsx
```

#### Props

```typescript
interface ApplicationCardProps {
  application: {
    title: string;
    category: string;
    deadline?: string;
    description?: string;
    url?: string;
    fee?: string;
    documents?: string[];
  };
  onSave?: () => void;
  onShare?: () => void;
  isSaved?: boolean;
}
```

#### Features

- ✅ Deadline countdown
- ✅ Category badge
- ✅ Save/unsave functionality
- ✅ Share option
- ✅ Responsive layout

#### Example

```typescript
import { ApplicationCard } from '@/components/ApplicationCard';

<ApplicationCard
  application={{
    title: 'SSC CGL 2025',
    category: 'Jobs',
    deadline: '2025-06-15',
    description: 'Combined Graduate Level Examination',
    url: 'https://ssc.nic.in'
  }}
  onSave={() => handleSave()}
  isSaved={false}
/>
```

---

### ApplicationsDashboard

User's applications dashboard.

#### Location

```
/src/components/ApplicationsDashboard.tsx
```

#### Props

```typescript
interface ApplicationsDashboardProps {
  userId: string;
}
```

#### Features

- ✅ Application status tracking
- ✅ Deadline reminders
- ✅ Filter and sort
- ✅ Quick actions

#### Example

```typescript
import { ApplicationsDashboard } from '@/components/ApplicationsDashboard';

<ApplicationsDashboard userId={user.id} />
```

#### Application Statuses

- **Draft**: Not submitted
- **Submitted**: Application sent
- **In Review**: Under review
- **Approved**: Application approved
- **Rejected**: Application rejected

---

### SavedApplicationCard

Card for saved/bookmarked applications.

#### Location

```
/src/components/SavedApplicationCard.tsx
```

#### Props

```typescript
interface SavedApplicationCardProps {
  application: SavedApplication;
  onRemove?: () => void;
  onApply?: () => void;
}
```

#### Features

- ✅ Save date display
- ✅ Quick apply
- ✅ Remove bookmark
- ✅ Status indicator

---

## Discovery Components

### StoryCard

News/discovery story card.

#### Location

```
/src/components/discover/StoryCard.tsx
```

#### Props

```typescript
interface StoryCardProps {
  story: {
    id: string;
    headline: string;
    summary: string;
    category: string;
    source_name: string;
    image_url?: string;
    published_at: string;
    view_count: number;
  };
  onView?: () => void;
  onSave?: () => void;
}
```

#### Features

- ✅ View tracking
- ✅ Engagement metrics
- ✅ Image optimization
- ✅ Category badges

---

### DiscoverFilters

Filter controls for discovery feed.

#### Location

```
/src/components/discover/DiscoverFilters.tsx
```

#### Props

```typescript
interface DiscoverFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  sortBy: 'recent' | 'popular' | 'trending';
  onSortChange: (sort: string) => void;
}
```

#### Categories

- All Stories
- Students
- Jobs
- Farmers
- Startups
- Health & Insurance

---

### EngagementMetrics

Display story engagement statistics.

#### Location

```
/src/components/discover/EngagementMetrics.tsx
```

#### Props

```typescript
interface EngagementMetricsProps {
  viewCount: number;
  saveCount?: number;
  shareCount?: number;
}
```

---

## UI Components

### Button

Versatile button component from shadcn/ui.

#### Import

```typescript
import { Button } from '@/components/ui/button';
```

#### Variants

```typescript
<Button variant="default">Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
```

#### Sizes

```typescript
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon</Button>
```

#### Examples

```typescript
// With icon
<Button>
  <Mail className="mr-2 h-4 w-4" />
  Login with Email
</Button>

// Loading state
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Please wait
</Button>

// As child
<Button asChild>
  <Link to="/login">Sign In</Link>
</Button>
```

---

### Card

Container component for content sections.

#### Import

```typescript
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
```

#### Example

```typescript
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description goes here</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

### Dialog

Modal dialog component.

#### Import

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
```

#### Example

```typescript
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        Dialog description goes here
      </DialogDescription>
    </DialogHeader>
    <div>
      {/* Dialog content */}
    </div>
  </DialogContent>
</Dialog>
```

---

### Toast

Notification toast component.

#### Import

```typescript
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
```

#### Setup

Add to root layout:

```typescript
function App() {
  return (
    <>
      <YourApp />
      <Toaster />
    </>
  );
}
```

#### Usage

```typescript
const { toast } = useToast();

// Success
toast({
  title: "Success",
  description: "Your changes have been saved.",
});

// Error
toast({
  variant: "destructive",
  title: "Error",
  description: "Something went wrong.",
});

// With action
toast({
  title: "Update Available",
  description: "A new version is available.",
  action: (
    <Button onClick={handleUpdate}>
      Update
    </Button>
  ),
});
```

---

## Best Practices

### 1. Type Safety

Always define prop types:

```typescript
// ✅ Good
interface MyProps {
  title: string;
  count?: number;
}

const MyComponent = ({ title, count = 0 }: MyProps) => {
  // ...
};

// ❌ Bad
const MyComponent = ({ title, count }) => {
  // No type safety
};
```

### 2. Component Composition

Break down complex components:

```typescript
// ✅ Good
<Card>
  <CardHeader>
    <ApplicationTitle title={app.title} />
    <ApplicationMeta deadline={app.deadline} />
  </CardHeader>
  <CardContent>
    <ApplicationDescription text={app.description} />
  </CardContent>
</Card>

// ❌ Bad: All logic in one component
<ApplicationCard {...props} />
```

### 3. Error Handling

Always handle errors:

```typescript
const MyComponent = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
  
  if (loading) return <Loader />;
  if (error) return <Error message={error.message} />;
  if (!data) return <Empty />;
  
  return <DataDisplay data={data} />;
};
```

### 4. Accessibility

Use semantic HTML and ARIA attributes:

```typescript
<Button
  aria-label="Close dialog"
  onClick={onClose}
>
  <X className="h-4 w-4" />
  <span className="sr-only">Close</span>
</Button>
```

### 5. Performance

Memoize expensive computations:

```typescript
import { useMemo, useCallback } from 'react';

const MyComponent = ({ items }) => {
  const sortedItems = useMemo(
    () => items.sort((a, b) => a.date - b.date),
    [items]
  );
  
  const handleClick = useCallback(
    (id) => {
      // Handle click
    },
    [] // Dependencies
  );
  
  return (
    <div>
      {sortedItems.map(item => (
        <Item key={item.id} onClick={() => handleClick(item.id)} />
      ))}
    </div>
  );
};
```

### 6. Responsive Design

Use Tailwind responsive classes:

```typescript
<div className="
  grid
  grid-cols-1
  sm:grid-cols-2
  md:grid-cols-3
  lg:grid-cols-4
  gap-4
">
  {items.map(item => <Card key={item.id} />)}
</div>
```

### 7. Loading States

Always show loading indicators:

```typescript
{isLoading ? (
  <div className="flex items-center gap-2">
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>Loading...</span>
  </div>
) : (
  <Content />
)}
```

---

## Component Testing

### Example Test

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('can be disabled', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

---

## Styling Guidelines

### Tailwind Utilities

```typescript
// Spacing
className="p-4 m-2 gap-3"

// Typography
className="text-lg font-semibold text-gray-900"

// Layout
className="flex items-center justify-between"

// Responsive
className="hidden md:block"

// Dark mode
className="bg-white dark:bg-gray-900"
```

### Custom Styles

Use `cn` helper for conditional classes:

```typescript
import { cn } from '@/lib/utils';

<Button
  className={cn(
    'base-classes',
    isActive && 'active-classes',
    isDisabled && 'disabled-classes'
  )}
/>
```

---

## Related Documentation

- [Custom Hooks API](./HOOKS_API.md)
- [Utilities API](./UTILITIES_API.md)
- [Edge Functions API](./EDGE_FUNCTIONS_API.md)
- [Main API Documentation](./API_DOCUMENTATION.md)

---

## Support

For component-related questions:
1. Check shadcn/ui documentation
2. Review component source code
3. Check storybook (if available)
4. Contact the development team
