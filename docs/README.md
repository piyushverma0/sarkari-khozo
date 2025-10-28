# Sarkari Khozo - Developer Documentation

> Comprehensive API documentation for the Sarkari Khozo application - Your gateway to Indian government schemes, exams, jobs, and startup programs.

## 📚 Documentation Index

### Core Documentation

1. **[API Documentation](./API_DOCUMENTATION.md)** - Main overview and getting started guide
   - Architecture overview
   - Environment setup
   - Authentication
   - Database access
   - Error handling

2. **[Custom Hooks API](./HOOKS_API.md)** - React hooks reference
   - `useTranslation` - Multi-language translation
   - `useTextToSpeech` - Audio narration
   - `useAudioNewsBulletin` - News bulletins
   - `usePushNotifications` - Web push notifications
   - `useViewTracking` - Analytics tracking
   - And 4 more hooks...

3. **[Utilities API](./UTILITIES_API.md)** - Helper functions and libraries
   - `cn` - Tailwind class merger
   - `debounce` - Function debouncing
   - Location services (states, districts, blocks)
   - Number formatters (Indian numbering system)
   - Stats validation and display helpers

4. **[Components API](./COMPONENTS_API.md)** - React components guide
   - Layout components (Header, ErrorBoundary)
   - Feature components (SearchAutocomplete, EligibilityQuiz)
   - Application components (ApplicationCard, Dashboard)
   - Discovery components (StoryCard, DiscoverFilters)
   - UI components (Button, Card, Dialog, Toast)

5. **[Edge Functions API](./EDGE_FUNCTIONS_API.md)** - Supabase serverless functions
   - AI-powered functions (process-query, translate-content)
   - Location services (check-local-availability)
   - Discovery & news (get-discovery-feed, audio-news-bulletin)
   - Application management
   - Notification system

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js 18+
npm or bun
Supabase account
Anthropic API key (for AI features)
```

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd sarkari-khozo

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run development server
npm run dev
```

### Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Push Notifications
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key

# Optional Feature Flags
VITE_ENABLE_AUDIO_NEWS=true
VITE_ENABLE_PUSH_NOTIFICATIONS=true
```

---

## 🏗️ Architecture

```
sarkari-khozo/
├── src/
│   ├── components/      # React components
│   │   ├── ui/         # shadcn/ui components
│   │   ├── auth/       # Authentication components
│   │   └── discover/   # Discovery feed components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Core utilities
│   ├── utils/          # Helper functions
│   ├── pages/          # Route pages
│   └── integrations/   # Third-party integrations
│       └── supabase/   # Supabase client
├── supabase/
│   ├── functions/      # Edge functions
│   │   ├── _shared/   # Shared utilities
│   │   └── */         # Individual functions
│   └── migrations/     # Database migrations
└── docs/               # Documentation (you are here!)
```

---

## 🔑 Key Features

### 1. Multi-Language Support

```typescript
import { useTranslation } from '@/hooks/useTranslation';

const { translateText, currentLanguage, changeLanguage } = useTranslation();

// Translate to Hindi
const hindi = await translateText('Hello', 'hi');
console.log(hindi); // 'नमस्ते'
```

Supported languages: **English**, **हिंदी (Hindi)**, **ಕನ್ನಡ (Kannada)**, **भोजपुरी (Bhojpuri)**

### 2. AI-Powered Search

```typescript
const { data } = await supabase.functions.invoke('process-query', {
  body: { query: 'SSC CGL 2025' }
});

// Returns comprehensive details:
// - Title, description, eligibility
// - Important dates (application, exam, results)
// - Fee structure, documents required
// - Step-by-step application guidance
```

### 3. Text-to-Speech

```typescript
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

const { speak, pause, resume, stop } = useTextToSpeech();

// Speak in Hindi
await speak('यह एक परीक्षा है', 'hi');
```

### 4. Location-Based Services

```typescript
import { getAllStates, getDistrictsByState } from '@/lib/locationService';

const states = await getAllStates();
const districts = await getDistrictsByState('Karnataka');
```

### 5. Push Notifications

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

const { subscribe, permission } = usePushNotifications(userId);

if (permission === 'default') {
  await subscribe();
}
```

---

## 📖 Usage Examples

### Example 1: Search for Government Schemes

```typescript
import { useState } from 'react';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import { supabase } from '@/integrations/supabase/client';

function SchemeSearch() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-query', {
        body: { query: searchQuery }
      });
      
      if (error) throw error;
      setResult(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SearchAutocomplete
        value={query}
        onChange={setQuery}
        onSelect={handleSearch}
        placeholder="Search for exams, jobs, or schemes..."
      />
      
      {loading && <p>Searching...</p>}
      {result && (
        <div>
          <h2>{result.title}</h2>
          <p>{result.description}</p>
          <p>Deadline: {result.important_dates.application_end}</p>
        </div>
      )}
    </div>
  );
}
```

### Example 2: Eligibility Quiz

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EligibilityQuiz } from '@/components/EligibilityQuiz';

function ApplicationPage({ application }) {
  const [showQuiz, setShowQuiz] = useState(false);

  return (
    <div>
      <h1>{application.title}</h1>
      <p>{application.eligibility}</p>
      
      <Button onClick={() => setShowQuiz(true)}>
        Check My Eligibility
      </Button>
      
      {showQuiz && (
        <EligibilityQuiz
          eligibility={application.eligibility}
          onClose={() => setShowQuiz(false)}
        />
      )}
    </div>
  );
}
```

### Example 3: Audio News Bulletin

```typescript
import { AudioNewsBanner } from '@/components/AudioNewsBanner';

function HomePage() {
  return (
    <div>
      <h1>Latest Updates</h1>
      
      {/* Automatically fetches and plays audio bulletins */}
      <AudioNewsBanner />
      
      {/* Rest of your content */}
    </div>
  );
}
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- SearchAutocomplete.test.tsx

# Run with coverage
npm test -- --coverage
```

### Writing Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';

describe('SearchAutocomplete', () => {
  it('filters suggestions based on input', () => {
    const handleChange = vi.fn();
    const handleSelect = vi.fn();
    
    render(
      <SearchAutocomplete
        value=""
        onChange={handleChange}
        onSelect={handleSelect}
        placeholder="Search..."
      />
    );
    
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'SSC' } });
    
    expect(handleChange).toHaveBeenCalledWith('SSC');
  });
});
```

---

## 🔧 Configuration

### Tailwind CSS

```javascript
// tailwind.config.ts
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Custom colors
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}
```

### TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 📊 Performance Tips

1. **Use React.memo for expensive components**
   ```typescript
   export const ExpensiveComponent = React.memo(({ data }) => {
     // Component logic
   });
   ```

2. **Lazy load routes**
   ```typescript
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

3. **Optimize images**
   ```typescript
   <img
     src={imageUrl}
     loading="lazy"
     alt="Description"
   />
   ```

4. **Debounce search inputs**
   ```typescript
   const debouncedSearch = debounce(handleSearch, 500);
   ```

5. **Cache API responses**
   ```typescript
   const cacheKey = `query-${query}`;
   const cached = localStorage.getItem(cacheKey);
   if (cached) return JSON.parse(cached);
   ```

---

## 🐛 Debugging

### Enable Debug Logs

```typescript
// In development
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}
```

### Supabase Edge Functions Logs

```bash
# View logs in Supabase dashboard
# Or use CLI:
supabase functions logs process-query --tail
```

### React DevTools

Install React DevTools browser extension for component inspection.

---

## 🤝 Contributing

### Code Style

- Use TypeScript for type safety
- Follow ESLint rules
- Use Prettier for formatting
- Write tests for new features

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/my-feature
```

### Commit Convention

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Tests
- `chore:` Maintenance

---

## 📦 Deployment

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

### Deploy to Production

The application is deployed automatically via Lovable's deployment system.

---

## 🔐 Security

### API Key Management

- Never commit API keys
- Use environment variables
- Rotate keys regularly

### Input Validation

- Sanitize user inputs
- Validate on both client and server
- Use Zod for schema validation

### CORS Configuration

All edge functions include proper CORS headers:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## 📝 License

This project is proprietary and confidential.

---

## 🆘 Support

### Getting Help

1. **Check Documentation**: Review docs in this `/docs` folder
2. **Search Issues**: Look for similar issues on GitHub
3. **Ask Team**: Contact the development team
4. **Create Issue**: Submit a detailed bug report

### Useful Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

---

## 📈 Roadmap

### Completed ✅

- [x] Multi-language support
- [x] Text-to-speech
- [x] AI-powered search
- [x] Push notifications
- [x] Audio news bulletins
- [x] Location-based services

### In Progress 🚧

- [ ] Offline mode
- [ ] Progressive Web App
- [ ] Advanced analytics
- [ ] Chatbot integration

### Planned 📅

- [ ] Mobile app (React Native)
- [ ] Admin dashboard
- [ ] Batch notifications
- [ ] Advanced filtering

---

## 🎉 Acknowledgments

Built with:
- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Supabase](https://supabase.com)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Anthropic Claude](https://www.anthropic.com)
- [Vite](https://vitejs.dev)

---

**Happy Coding! 🚀**

For questions or feedback, contact the development team.
