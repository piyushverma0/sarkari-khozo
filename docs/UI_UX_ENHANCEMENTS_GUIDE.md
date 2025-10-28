# UI/UX Enhancements Guide

Complete documentation for enhanced loading states, mobile optimizations, and user onboarding features in Sarkari Khozo.

## 📚 Table of Contents

1. [Skeleton Screens & Loading States](#skeleton-screens--loading-states)
2. [Progress Indicators](#progress-indicators)
3. [Mobile Optimizations](#mobile-optimizations)
4. [User Onboarding](#user-onboarding)
5. [Empty States](#empty-states)
6. [Usage Examples](#usage-examples)

---

## Skeleton Screens & Loading States

### Overview

Comprehensive skeleton screens for better perceived performance:

- ✅ **15+ skeleton components** - For every page type
- ✅ **Shimmer effects** - Smooth animations
- ✅ **Context-aware** - Matches actual content layout
- ✅ **Responsive** - Works on all screen sizes

### Available Skeleton Components

```typescript
import {
  ApplicationCardSkeleton,
  ApplicationListSkeleton,
  SearchResultsSkeleton,
  DashboardStatsSkeleton,
  ProfileSkeleton,
  TableSkeleton,
  FormSkeleton,
  NotificationListSkeleton,
  CategoryGridSkeleton,
  DetailPageSkeleton,
  FeedSkeleton,
  ChatSkeleton,
  TimelineSkeleton,
  CalendarEventsSkeleton,
  ContentSkeleton,
} from '@/components/ui/skeleton-screens';
```

### Usage Examples

#### Application List Loading

```typescript
import { ApplicationListSkeleton } from '@/components/ui/skeleton-screens';

function ApplicationsList() {
  const { data, isLoading } = useQuery('applications');

  if (isLoading) {
    return <ApplicationListSkeleton count={5} />;
  }

  return data.map(app => <ApplicationCard key={app.id} {...app} />);
}
```

#### Search Results Loading

```typescript
import { SearchResultsSkeleton } from '@/components/ui/skeleton-screens';

function SearchPage() {
  const { results, isSearching } = useSearch();

  if (isSearching) {
    return <SearchResultsSkeleton />;
  }

  return <SearchResults results={results} />;
}
```

#### Dashboard Stats Loading

```typescript
import { DashboardStatsSkeleton } from '@/components/ui/skeleton-screens';

function Dashboard() {
  const { stats, loading } = useDashboardStats();

  if (loading) {
    return <DashboardStatsSkeleton />;
  }

  return <StatsDisplay stats={stats} />;
}
```

### Custom Skeleton Patterns

```typescript
// Simple content skeleton
<div className="space-y-4">
  <Skeleton className="h-8 w-3/4" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-5/6" />
</div>

// Card skeleton
<Card className="p-6">
  <Skeleton className="h-6 w-48 mb-4" />
  <Skeleton className="h-4 w-full mb-2" />
  <Skeleton className="h-4 w-2/3" />
</Card>
```

---

## Progress Indicators

### Step Progress Component

Multi-step progress for forms and processes:

```typescript
import { StepProgress, Step } from '@/components/ui/progress-indicator';

const steps: Step[] = [
  { id: '1', title: 'Personal Info', description: 'Basic details' },
  { id: '2', title: 'Documents', description: 'Upload files' },
  { id: '3', title: 'Review', description: 'Confirm details' },
  { id: '4', title: 'Submit', description: 'Complete application' },
];

<StepProgress
  steps={steps}
  currentStep={2}
  variant="horizontal" // or "vertical"
/>
```

**Features:**
- Horizontal or vertical layout
- Completed/current/upcoming states
- Optional icons
- Step descriptions
- Responsive design

### Linear Progress

Progress bar with percentage:

```typescript
import { LinearProgress } from '@/components/ui/progress-indicator';

<LinearProgress
  value={65}
  max={100}
  showPercentage={true}
  label="Upload Progress"
/>
```

### Circular Progress

Circular progress indicator:

```typescript
import { CircularProgress } from '@/components/ui/progress-indicator';

<CircularProgress
  value={75}
  max={100}
  size={120}
  strokeWidth={8}
  showPercentage={true}
/>
```

### Loading Bar

Top-of-page loading indicator:

```typescript
import { LoadingBar } from '@/components/ui/progress-indicator';

function App() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      <LoadingBar isLoading={isLoading} />
      <YourContent />
    </>
  );
}
```

### Upload Progress

File upload with progress:

```typescript
import { UploadProgress } from '@/components/ui/progress-indicator';

<UploadProgress
  fileName="document.pdf"
  fileSize={1024000}
  uploadedSize={512000}
  onCancel={() => cancelUpload()}
/>
```

---

## Mobile Optimizations

### Touch-Optimized Components

Minimum 44x44px touch targets (Apple Human Interface Guidelines):

```typescript
import {
  TouchButton,
  TouchInput,
  usePreventZoom,
  SafeAreaView,
  useHapticFeedback,
} from '@/components/mobile/MobileOptimizations';

// Touch-optimized button
<TouchButton
  onClick={handleClick}
  minSize={44}
>
  Click Me
</TouchButton>

// Touch-optimized input (prevents iOS zoom)
<TouchInput
  placeholder="Search..."
  minHeight={44}
/>
```

### Bottom Sheet

iOS/Android-style bottom sheet with swipe gestures:

```typescript
import { BottomSheet, SimpleBottomSheet } from '@/components/mobile/BottomSheet';

// Full-featured bottom sheet
<BottomSheet
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Filter Options"
  description="Refine your search"
  snapPoints={[50, 100]}
  initialSnapPoint={0}
  showHandle={true}
>
  <FilterForm />
</BottomSheet>

// Simple bottom sheet (no snap points)
<SimpleBottomSheet
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Quick Actions"
>
  <ActionList />
</SimpleBottomSheet>
```

**Features:**
- Swipe-to-dismiss
- Multiple snap points (50%, 100%)
- Drag handle
- Backdrop click to close
- Mobile-optimized animations

### Pull-to-Refresh

Mobile pull-to-refresh interaction:

```typescript
import { PullToRefresh } from '@/components/mobile/PullToRefresh';

<PullToRefresh
  onRefresh={async () => {
    await refreshData();
  }}
  threshold={80}
>
  <YourContent />
</PullToRefresh>
```

**Features:**
- iOS-style pull interaction
- Resistance curve
- Refresh animation
- Customizable threshold

### Safe Area View

Handles notch and safe areas:

```typescript
import { SafeAreaView } from '@/components/mobile/MobileOptimizations';

<SafeAreaView className="bg-background">
  <YourContent />
</SafeAreaView>
```

### Haptic Feedback

Vibration API integration:

```typescript
import { useHapticFeedback } from '@/components/mobile/MobileOptimizations';

function MyComponent() {
  const haptic = useHapticFeedback();

  const handleSuccess = () => {
    haptic.success();
  };

  const handleError = () => {
    haptic.error();
  };

  return (
    <>
      <Button onClick={handleSuccess}>Success Haptic</Button>
      <Button onClick={handleError}>Error Haptic</Button>
    </>
  );
}
```

**Available Patterns:**
- `light()` - 10ms vibration
- `medium()` - 20ms
- `heavy()` - 30ms
- `success()` - [10, 50, 10]
- `error()` - [50, 100, 50]
- `pattern(array)` - Custom pattern

### Mobile Tab Bar

Bottom navigation for mobile:

```typescript
import { MobileTabBar } from '@/components/mobile/MobileOptimizations';

<MobileTabBar
  items={[
    { icon: <Home />, label: 'Home', href: '/', badge: 0 },
    { icon: <Search />, label: 'Search', href: '/search', badge: 0 },
    { icon: <Bell />, label: 'Alerts', href: '/alerts', badge: 3 },
    { icon: <User />, label: 'Profile', href: '/profile', badge: 0 },
  ]}
  activeIndex={0}
  onItemClick={(index) => navigate(items[index].href)}
/>
```

### Swipeable Card

Dismissible cards with swipe gestures:

```typescript
import { SwipeableCard } from '@/components/mobile/MobileOptimizations';

<SwipeableCard
  onSwipeLeft={() => handleDelete()}
  onSwipeRight={() => handleArchive()}
  threshold={100}
>
  <NotificationCard />
</SwipeableCard>
```

---

## User Onboarding

### Guided Tours

Interactive product tours using react-joyride:

```typescript
import { OnboardingTour, useOnboarding } from '@/components/onboarding/OnboardingTour';

function SearchPage() {
  const { runTour, completeTour } = useOnboarding('search');

  return (
    <>
      <OnboardingTour
        tourType="search"
        run={runTour}
        onComplete={completeTour}
      />
      
      <div data-tour="search-input">
        <SearchInput />
      </div>
      
      <div data-tour="search-filters">
        <Filters />
      </div>
    </>
  );
}
```

**Available Tours:**
- `search` - Search functionality
- `eligibility` - Eligibility quiz
- `application` - Application tracking
- `location` - Location settings
- `discover` - Discovery feed

**Tour Management:**

```typescript
const {
  runTour,           // Boolean - is tour running
  hasCompletedTour,  // Boolean - has user completed
  startTour,         // Function - manually start tour
  completeTour,      // Function - mark as complete
  resetTour,         // Function - reset completion
} = useOnboarding('search');

// Manually trigger tour
<Button onClick={startTour}>Show Tour</Button>
```

### Feature Discovery Hints

Contextual tooltips for feature discovery:

```typescript
import { FeatureHint, useFeatureDiscovery } from '@/components/onboarding/FeatureDiscovery';

<FeatureHint
  id="share-button"
  target="[data-feature='share']"
  title="Share with Friends"
  description="Share opportunities via WhatsApp, Telegram, and more!"
  placement="bottom"
  delay={2000}
  dismissible={true}
  showOnce={true}
/>
```

**Props:**
- `id` - Unique identifier
- `target` - CSS selector for element
- `title` - Hint title
- `description` - Hint description
- `placement` - top, bottom, left, right
- `delay` - Show after X ms
- `dismissible` - Can be closed
- `showOnce` - Show only once

### Feature Spotlight

Highlight specific features:

```typescript
import { FeatureSpotlight } from '@/components/onboarding/FeatureDiscovery';

<FeatureSpotlight
  target="[data-feature='new-feature']"
  title="New Feature!"
  description="Check out our latest feature to make your experience better."
  onComplete={() => setSpotlightComplete(true)}
/>
```

### Progressive Disclosure

Show advanced features gradually:

```typescript
import { ProgressiveDisclosure } from '@/components/onboarding/FeatureDiscovery';

<ProgressiveDisclosure level={2}>
  <AdvancedFilters />
</ProgressiveDisclosure>
```

**User levels:**
- Level 0: New users
- Level 1: Active users (5+ actions)
- Level 2: Power users (20+ actions)
- Level 3: Experts (50+ actions)

---

## Empty States

### Predefined Empty States

```typescript
import {
  EmptySearchResults,
  EmptyApplicationsList,
  EmptySavedItems,
  EmptyNotifications,
  EmptyRecentlyViewed,
  NoInternetConnection,
  ErrorState,
  MaintenanceMode,
  ComingSoon,
} from '@/components/onboarding/EmptyState';

// No search results
<EmptySearchResults
  onClearFilters={() => clearFilters()}
/>

// No applications
<EmptyApplicationsList
  onBrowseSchemes={() => navigate('/discover')}
/>

// Error state
<ErrorState
  title="Failed to load data"
  description="Please try again."
  onRetry={() => refetch()}
/>
```

### Custom Empty State

```typescript
import { EmptyState } from '@/components/onboarding/EmptyState';
import { FileText } from 'lucide-react';

<EmptyState
  icon={FileText}
  title="No documents found"
  description="Upload documents to get started."
  action={{
    label: 'Upload Document',
    onClick: () => openUploadDialog(),
  }}
  secondaryAction={{
    label: 'Learn More',
    onClick: () => openHelpDialog(),
  }}
/>
```

### Inline Empty State

Smaller empty state for cards:

```typescript
import { InlineEmptyState } from '@/components/onboarding/EmptyState';
import { Bell } from 'lucide-react';

<InlineEmptyState
  icon={Bell}
  message="No new notifications"
  action={{
    label: 'View All',
    onClick: () => navigate('/notifications'),
  }}
/>
```

---

## Usage Examples

### Complete Application Page with All Features

```typescript
import { ApplicationCardSkeleton } from '@/components/ui/skeleton-screens';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { EmptyApplicationsList } from '@/components/onboarding/EmptyState';
import { OnboardingTour, useOnboarding } from '@/components/onboarding/OnboardingTour';
import { FeatureHint } from '@/components/onboarding/FeatureDiscovery';

function ApplicationsPage() {
  const { data, isLoading, refetch } = useApplications();
  const [filterOpen, setFilterOpen] = useState(false);
  const { runTour, completeTour } = useOnboarding('application');

  if (isLoading) {
    return <ApplicationCardSkeleton count={3} />;
  }

  if (data.length === 0) {
    return <EmptyApplicationsList onBrowseSchemes={() => navigate('/discover')} />;
  }

  return (
    <>
      {/* Onboarding */}
      <OnboardingTour
        tourType="application"
        run={runTour}
        onComplete={completeTour}
      />

      <FeatureHint
        id="save-feature"
        target="[data-feature='save']"
        title="Save for Later"
        description="Save applications to access them quickly."
      />

      {/* Pull to Refresh */}
      <PullToRefresh onRefresh={refetch}>
        <div className="space-y-4">
          {data.map(app => (
            <ApplicationCard
              key={app.id}
              data-tour="application-card"
              {...app}
            />
          ))}
        </div>
      </PullToRefresh>

      {/* Filter Bottom Sheet */}
      <BottomSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title="Filter Applications"
      >
        <FilterForm />
      </BottomSheet>
    </>
  );
}
```

### Multi-step Form with Progress

```typescript
import { StepProgress } from '@/components/ui/progress-indicator';
import { FormSkeleton } from '@/components/ui/skeleton-screens';

function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const steps = [
    { id: '1', title: 'Personal Info' },
    { id: '2', title: 'Documents' },
    { id: '3', title: 'Review' },
    { id: '4', title: 'Submit' },
  ];

  if (isLoading) {
    return <FormSkeleton fields={5} />;
  }

  return (
    <div className="space-y-8">
      <StepProgress
        steps={steps}
        currentStep={currentStep}
        variant="horizontal"
      />

      <div>{/* Form content for current step */}</div>

      <div className="flex gap-2">
        {currentStep > 0 && (
          <Button onClick={() => setCurrentStep(currentStep - 1)}>
            Previous
          </Button>
        )}
        <Button onClick={() => setCurrentStep(currentStep + 1)}>
          {currentStep === steps.length - 1 ? 'Submit' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
```

---

## Best Practices

### Loading States

1. **Show skeletons immediately** - No delay
2. **Match content layout** - Same structure as loaded content
3. **Use appropriate skeleton** - Pick the right skeleton component
4. **Avoid spinners** - Use skeletons for better UX

### Progress Indicators

1. **Show progress for long operations** - >2 seconds
2. **Use step progress for multi-step** - Clear navigation
3. **Provide feedback** - User knows what's happening
4. **Allow cancellation** - When possible

### Mobile Optimizations

1. **44x44px minimum touch targets** - Apple HIG
2. **Test on real devices** - Emulators aren't enough
3. **Use bottom sheets** - Better than modals on mobile
4. **Implement pull-to-refresh** - Expected on mobile
5. **Add haptic feedback** - Enhance interactions

### Onboarding

1. **Tour on first visit** - Auto-start for new users
2. **Skip button always** - Don't force users
3. **Short tours** - 4-5 steps maximum
4. **Contextual hints** - Show when relevant
5. **Allow replay** - Help menu option

### Empty States

1. **Always provide context** - Explain why empty
2. **Offer clear action** - What can user do?
3. **Use friendly tone** - Not technical errors
4. **Add illustrations** - Make it visually appealing

---

## Performance

### Skeleton Screens

- **No impact** - Static components
- **Instant render** - No data fetching
- **Perceived performance** - Feels faster

### Mobile Components

- **Touch-optimized** - Minimal re-renders
- **Gesture-based** - Native feel
- **Lazy-loaded** - Import only when needed

### Onboarding

- **Lazy imports** - Load tours on demand
- **LocalStorage cache** - Track completion
- **Conditional rendering** - Show only when needed

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Skeletons | ✅ All | ✅ All | ✅ All | ✅ All |
| Progress | ✅ All | ✅ All | ✅ All | ✅ All |
| Bottom Sheet | ✅ All | ✅ All | ✅ All | ✅ All |
| Pull-to-Refresh | ✅ All | ✅ All | ✅ All | ✅ All |
| Haptic Feedback | ✅ 32+ | ✅ 16+ | ✅ 13+ | ✅ 79+ |
| Tours (Joyride) | ✅ All | ✅ All | ✅ All | ✅ All |

---

## Accessibility

### Keyboard Navigation

- All interactive elements keyboard-accessible
- Focus indicators visible
- Skip to content links

### Screen Readers

- Proper ARIA labels
- Live regions for loading states
- Semantic HTML

### Motion

- Respect `prefers-reduced-motion`
- Provide static alternatives
- Optional animations

---

**Implementation Date**: 2025-10-28  
**Status**: ✅ Complete and Production Ready  
**Breaking Changes**: None  

Enjoy enhanced UI/UX! ✨🎨📱
