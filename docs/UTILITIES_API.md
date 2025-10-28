# Utilities API Reference

This document provides comprehensive documentation for all utility functions and libraries in the Sarkari Khozo application.

## Table of Contents

1. [Core Utilities](#core-utilities)
   - [cn (className merge)](#cn-classname-merge)
2. [Debounce Utilities](#debounce-utilities)
   - [debounce](#debounce)
3. [Location Services](#location-services)
   - [getAllStates](#getallstates)
   - [getDistrictsByState](#getdistrictsbystate)
   - [getBlocksByDistrict](#getblocksbydistrict)
   - [reverseGeocode](#reversegeocode)
   - [saveUserLocation](#saveuserlocation)
   - [getUserSavedLocation](#getusersavedlocation)
4. [Formatting Utilities](#formatting-utilities)
   - [formatViewCount](#formatviewcount)
   - [formatIndianNumber](#formatindiannumber)
   - [calculateRatio](#calculateratio)
   - [getCompetitionLevel](#getcompetitionlevel)
   - [validateStats](#validatestats)
   - [shouldDisplayStats](#shoulddisplaystats)
   - [getConfidenceBadgeVariant](#getconfidencebadgevariant)
   - [getConfidenceLabel](#getconfidencelabel)

---

## Core Utilities

### cn (className merge)

Utility for merging Tailwind CSS classes with proper precedence.

#### Import

```typescript
import { cn } from '@/lib/utils';
```

#### Signature

```typescript
function cn(...inputs: ClassValue[]): string
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `inputs` | `ClassValue[]` | Variable number of class values |

#### Returns

`string` - Merged class names with proper Tailwind precedence

#### Features

- ✅ Merges multiple class strings
- ✅ Handles conditional classes
- ✅ Resolves Tailwind conflicts (later classes override earlier ones)
- ✅ Removes duplicates

#### Examples

##### Basic Merge

```typescript
cn('px-4 py-2', 'bg-blue-500')
// Returns: 'px-4 py-2 bg-blue-500'
```

##### Conditional Classes

```typescript
cn(
  'px-4 py-2',
  isActive && 'bg-blue-500',
  isDisabled && 'opacity-50'
)
// Returns: 'px-4 py-2 bg-blue-500' (if isActive is true)
```

##### Tailwind Conflicts Resolution

```typescript
cn('px-4', 'px-6')
// Returns: 'px-6' (later value wins)

cn('text-sm font-normal', 'text-lg font-bold')
// Returns: 'text-lg font-bold'
```

##### Component Usage

```typescript
interface ButtonProps {
  className?: string;
  variant?: 'default' | 'outline';
}

const Button = ({ className, variant = 'default' }: ButtonProps) => {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-md',
        variant === 'default' && 'bg-blue-500 text-white',
        variant === 'outline' && 'border border-blue-500 text-blue-500',
        className
      )}
    >
      Click me
    </button>
  );
};
```

---

## Debounce Utilities

### debounce

Delays function execution until after a specified wait time has elapsed since the last invocation.

#### Import

```typescript
import { debounce } from '@/lib/debounce';
```

#### Signature

```typescript
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `func` | `T` | Function to debounce |
| `wait` | `number` | Wait time in milliseconds |

#### Returns

Debounced function with same parameters as original

#### Features

- ✅ Automatic timeout cleanup
- ✅ TypeScript generic support
- ✅ Preserves function parameters
- ✅ Prevents excessive function calls

#### Examples

##### Search Input Debouncing

```typescript
import { debounce } from '@/lib/debounce';

const handleSearch = async (query: string) => {
  const results = await searchAPI(query);
  console.log(results);
};

// Debounce with 500ms delay
const debouncedSearch = debounce(handleSearch, 500);

// In component
<input
  type="text"
  onChange={(e) => debouncedSearch(e.target.value)}
/>
```

##### Window Resize Handler

```typescript
const handleResize = () => {
  console.log('Window resized:', window.innerWidth);
};

const debouncedResize = debounce(handleResize, 300);

window.addEventListener('resize', debouncedResize);
```

##### API Call Debouncing

```typescript
const saveData = async (data: FormData) => {
  await fetch('/api/save', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

const debouncedSave = debounce(saveData, 1000);

// Called multiple times, but only executes once after 1s
debouncedSave(formData);
debouncedSave(formData);
debouncedSave(formData);
// Only last call executes after 1 second
```

---

## Location Services

Comprehensive location services for Indian states, districts, and blocks.

### getAllStates

Fetch all Indian states with caching.

#### Import

```typescript
import { getAllStates } from '@/lib/locationService';
```

#### Signature

```typescript
async function getAllStates(): Promise<State[]>
```

#### Returns

```typescript
interface State {
  id: string;
  name: string;
  code: string;
}
```

#### Features

- ✅ 24-hour localStorage caching
- ✅ Sorted alphabetically by name
- ✅ Error handling with empty array fallback

#### Example

```typescript
const states = await getAllStates();

console.log(states);
// [
//   { id: '1', name: 'Andhra Pradesh', code: 'AP' },
//   { id: '2', name: 'Gujarat', code: 'GJ' },
//   { id: '3', name: 'Karnataka', code: 'KA' },
//   ...
// ]
```

---

### getDistrictsByState

Fetch districts for a given state.

#### Import

```typescript
import { getDistrictsByState } from '@/lib/locationService';
```

#### Signature

```typescript
async function getDistrictsByState(stateName: string): Promise<string[]>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `stateName` | `string` | Name of the state |

#### Returns

Array of district names

#### Features

- ✅ State-specific caching
- ✅ Sorted alphabetically
- ✅ Handles invalid state names

#### Example

```typescript
const districts = await getDistrictsByState('Karnataka');

console.log(districts);
// ['Bangalore Urban', 'Bangalore Rural', 'Mysore', 'Mangalore', ...]
```

---

### getBlocksByDistrict

Fetch blocks/talukas for a given district.

#### Import

```typescript
import { getBlocksByDistrict } from '@/lib/locationService';
```

#### Signature

```typescript
async function getBlocksByDistrict(
  stateName: string,
  districtName: string
): Promise<string[]>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `stateName` | `string` | Name of the state |
| `districtName` | `string` | Name of the district |

#### Returns

Array of block/taluka names

#### Example

```typescript
const blocks = await getBlocksByDistrict('Karnataka', 'Bangalore Urban');

console.log(blocks);
// ['Anekal', 'Bangalore East', 'Bangalore North', ...]
```

---

### reverseGeocode

Convert latitude/longitude to state and district.

#### Import

```typescript
import { reverseGeocode } from '@/lib/locationService';
```

#### Signature

```typescript
async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ state: string; district: string }>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `lat` | `number` | Latitude |
| `lng` | `number` | Longitude |

#### Returns

```typescript
{
  state: string;    // Matched Indian state name
  district: string; // District name
}
```

#### Features

- ✅ Uses OpenStreetMap Nominatim API
- ✅ Validates India bounds (6-37°N, 68-98°E)
- ✅ Fuzzy matching against known states
- ✅ Error handling for invalid locations

#### Example

```typescript
try {
  const location = await reverseGeocode(12.9716, 77.5946);
  console.log(location);
  // { state: 'Karnataka', district: 'Bangalore Urban' }
} catch (error) {
  console.error('Location outside India or geocoding failed');
}
```

---

### saveUserLocation

Save user's location to their profile.

#### Import

```typescript
import { saveUserLocation } from '@/lib/locationService';
```

#### Signature

```typescript
async function saveUserLocation(
  userId: string,
  state: string,
  district?: string,
  block?: string
): Promise<void>
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | `string` | Yes | User's ID |
| `state` | `string` | Yes | State name |
| `district` | `string` | No | District name |
| `block` | `string` | No | Block/taluka name |

#### Example

```typescript
await saveUserLocation(
  'user-123',
  'Karnataka',
  'Bangalore Urban',
  'Bangalore North'
);
```

---

### getUserSavedLocation

Retrieve user's saved location.

#### Import

```typescript
import { getUserSavedLocation } from '@/lib/locationService';
```

#### Signature

```typescript
async function getUserSavedLocation(userId: string): Promise<{
  saved_state: string | null;
  saved_district: string | null;
  saved_block: string | null;
} | null>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | `string` | User's ID |

#### Example

```typescript
const location = await getUserSavedLocation('user-123');

if (location) {
  console.log(`${location.saved_block}, ${location.saved_district}, ${location.saved_state}`);
  // 'Bangalore North, Bangalore Urban, Karnataka'
}
```

---

## Formatting Utilities

### formatViewCount

Format view counts into human-readable strings.

#### Import

```typescript
import { formatViewCount } from '@/utils/formatViewCount';
```

#### Signature

```typescript
function formatViewCount(count: number): string
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `count` | `number` | View count number |

#### Returns

Formatted string (e.g., "1.2K", "1M")

#### Examples

```typescript
formatViewCount(500);       // '500'
formatViewCount(1234);      // '1.2K'
formatViewCount(1500);      // '1.5K'
formatViewCount(1000000);   // '1M'
formatViewCount(2500000);   // '2.5M'
```

---

### formatIndianNumber

Format numbers in Indian numbering system.

#### Import

```typescript
import { formatIndianNumber } from '@/utils/statsFormatting';
```

#### Signature

```typescript
function formatIndianNumber(num: number): string
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `num` | `number` | Number to format |

#### Returns

Formatted string in Indian style

#### Examples

```typescript
formatIndianNumber(500);         // '500'
formatIndianNumber(1500);        // '1.5K'
formatIndianNumber(150000);      // '1.5 lakh'
formatIndianNumber(15000000);    // '1.5 crore'
formatIndianNumber(100000000);   // '10.0 crore'
```

---

### calculateRatio

Calculate competition ratio (applicants per vacancy).

#### Import

```typescript
import { calculateRatio } from '@/utils/statsFormatting';
```

#### Signature

```typescript
function calculateRatio(applicants: number, vacancies: number): string
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `applicants` | `number` | Number of applicants |
| `vacancies` | `number` | Number of vacancies |

#### Returns

Ratio string (e.g., "100:1", "N/A")

#### Examples

```typescript
calculateRatio(10000, 100);  // '100:1'
calculateRatio(50000, 500);  // '100:1'
calculateRatio(0, 100);      // 'N/A'
calculateRatio(100, 0);      // 'N/A'
```

---

### getCompetitionLevel

Get competition level based on ratio.

#### Import

```typescript
import { getCompetitionLevel } from '@/utils/statsFormatting';
```

#### Signature

```typescript
function getCompetitionLevel(ratio: string): 'low' | 'medium' | 'high'
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `ratio` | `string` | Ratio string from calculateRatio |

#### Returns

Competition level

#### Rules

- **High**: Ratio > 1000:1
- **Medium**: Ratio 100-1000:1
- **Low**: Ratio < 100:1

#### Example

```typescript
getCompetitionLevel('50:1');      // 'low'
getCompetitionLevel('500:1');     // 'medium'
getCompetitionLevel('2000:1');    // 'high'
getCompetitionLevel('N/A');       // 'medium'
```

---

### validateStats

Validate statistics data for reasonableness.

#### Import

```typescript
import { validateStats } from '@/utils/statsFormatting';
```

#### Signature

```typescript
function validateStats(stats: any): boolean
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `stats` | `any` | Stats object to validate |

#### Returns

`true` if stats are valid, `false` otherwise

#### Validation Rules

- Applicants: 10 - 100,000,000
- Vacancies: 1 - 10,000,000
- Ratio: 1:1 - 1,000,000:1

#### Example

```typescript
validateStats({
  applicants_count: 10000,
  vacancies: 100
});
// true

validateStats({
  applicants_count: 5,  // Too low
  vacancies: 100
});
// false

validateStats({
  applicants_count: 100,
  vacancies: 1000  // Invalid ratio (< 1)
});
// false
```

---

### shouldDisplayStats

Check if stats should be displayed based on confidence.

#### Import

```typescript
import { shouldDisplayStats } from '@/utils/statsFormatting';
```

#### Signature

```typescript
function shouldDisplayStats(stats: any): boolean
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `stats` | `any` | Stats object with confidence |

#### Returns

`true` if stats should be displayed

#### Rules

Display if:
- `data_confidence === 'verified'` OR
- `confidence_score > 0.7`

#### Example

```typescript
shouldDisplayStats({
  data_confidence: 'verified',
  applicants_count: 10000
});
// true

shouldDisplayStats({
  confidence_score: 0.8,
  applicants_count: 10000
});
// true

shouldDisplayStats({
  confidence_score: 0.5,
  applicants_count: 10000
});
// false
```

---

### getConfidenceBadgeVariant

Get badge variant based on confidence level.

#### Import

```typescript
import { getConfidenceBadgeVariant } from '@/utils/statsFormatting';
```

#### Signature

```typescript
function getConfidenceBadgeVariant(
  confidence: string
): 'default' | 'outline' | 'secondary'
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `confidence` | `string` | Confidence level |

#### Returns

Badge variant name

#### Mapping

- `'verified'` → `'default'`
- `'estimated'` → `'outline'`
- Other → `'secondary'`

#### Example

```typescript
getConfidenceBadgeVariant('verified');    // 'default'
getConfidenceBadgeVariant('estimated');   // 'outline'
getConfidenceBadgeVariant('community');   // 'secondary'
```

---

### getConfidenceLabel

Get display label for confidence level.

#### Import

```typescript
import { getConfidenceLabel } from '@/utils/statsFormatting';
```

#### Signature

```typescript
function getConfidenceLabel(confidence: string): string
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `confidence` | `string` | Confidence level |

#### Returns

Display label with emoji

#### Mapping

- `'verified'` → `'✓ Verified'`
- `'estimated'` → `'≈ Estimated'`
- Other → `'👥 Community'`

#### Example

```typescript
getConfidenceLabel('verified');    // '✓ Verified'
getConfidenceLabel('estimated');   // '≈ Estimated'
getConfidenceLabel('community');   // '👥 Community'
```

---

## Best Practices

### 1. Always Use cn for Class Merging

❌ **Bad**
```typescript
<div className={`base-class ${isActive ? 'active-class' : ''}`} />
```

✅ **Good**
```typescript
<div className={cn('base-class', isActive && 'active-class')} />
```

### 2. Debounce Expensive Operations

❌ **Bad**
```typescript
<input onChange={(e) => searchAPI(e.target.value)} />
```

✅ **Good**
```typescript
const debouncedSearch = debounce(searchAPI, 500);
<input onChange={(e) => debouncedSearch(e.target.value)} />
```

### 3. Cache Location Data

The location service automatically caches data for 24 hours. Don't implement additional caching.

### 4. Validate Before Displaying Stats

```typescript
if (validateStats(stats) && shouldDisplayStats(stats)) {
  return <StatsDisplay stats={stats} />;
}
```

---

## Performance Tips

1. **Location Service**: First call may be slow; subsequent calls use cache
2. **Debounce**: Use 300-500ms for search, 1000ms for auto-save
3. **Number Formatting**: These are pure functions, safe to call frequently

---

## TypeScript Support

All utilities are fully typed:

```typescript
// Type inference works automatically
const classes = cn('px-4', 'py-2'); // string

// Location types
interface State {
  id: string;
  name: string;
  code: string;
}

// Debounce preserves function signature
const originalFn = (a: number, b: string) => void 0;
const debounced = debounce(originalFn, 500);
// debounced: (a: number, b: string) => void
```

---

## Error Handling

### Location Services

```typescript
try {
  const location = await reverseGeocode(lat, lng);
} catch (error) {
  if (error.message.includes('outside India')) {
    // Handle non-India location
  } else {
    // Handle geocoding failure
  }
}
```

### Stats Validation

```typescript
if (!validateStats(stats)) {
  console.warn('Invalid stats detected:', stats);
  return null; // Don't display
}
```

---

## Browser Compatibility

All utilities work in modern browsers with ES6+ support. The location service requires:
- `localStorage` API
- `fetch` API
- Network connectivity for geocoding

---

## Support

For issues with utilities:
1. Check the inline JSDoc comments
2. Review examples in this guide
3. Test with provided examples
4. Contact the development team
