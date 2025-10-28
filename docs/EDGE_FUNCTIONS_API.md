# Supabase Edge Functions API Reference

This document provides comprehensive documentation for all Supabase Edge Functions in the Sarkari Khozo application.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [AI-Powered Functions](#ai-powered-functions)
   - [process-query](#process-query)
   - [translate-content](#translate-content)
   - [generate-eligibility-quiz](#generate-eligibility-quiz)
   - [chat-with-program](#chat-with-program)
   - [find-category-schemes](#find-category-schemes)
4. [Location & Availability Functions](#location--availability-functions)
   - [check-local-availability](#check-local-availability)
   - [find-nearest-csc](#find-nearest-csc)
5. [Discovery & News Functions](#discovery--news-functions)
   - [get-discovery-feed](#get-discovery-feed)
   - [generate-audio-news-bulletin](#generate-audio-news-bulletin)
   - [track-story-interaction](#track-story-interaction)
6. [Application Management Functions](#application-management-functions)
   - [find-active-applications](#find-active-applications)
   - [update-application-status](#update-application-status)
   - [track-application-view](#track-application-view)
7. [Notification Functions](#notification-functions)
   - [send-push-notification](#send-push-notification)
   - [schedule-notifications](#schedule-notifications)
8. [Shared Utilities](#shared-utilities)
   - [claude-client](#claude-client)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)

---

## Overview

All edge functions are deployed on Deno runtime and follow these conventions:

### Base URL

```
https://[PROJECT_REF].supabase.co/functions/v1/
```

### CORS Headers

All functions support CORS and include:

```typescript
{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}
```

### Authentication

Most functions require Supabase authentication. Include the JWT token in headers:

```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { /* parameters */ }
});
```

---

## AI-Powered Functions

### process-query

Extract detailed information about Indian government schemes, exams, and jobs.

#### Endpoint

```
POST /functions/v1/process-query
```

#### Request Body

```typescript
{
  query: string; // Search query or URL
}
```

#### Response

```typescript
{
  // For specific schemes/exams
  title: string;
  description: string;
  url: string;
  category: 'Students' | 'Farmers' | 'Senior Citizens' | 'Health & Insurance' | 'Women & Children' | 'Jobs' | 'Startups';
  
  important_dates: {
    application_start: string;      // YYYY-MM-DD or "Not yet announced"
    application_end: string;
    admit_card_date?: string;
    exam_date?: string;
    result_date?: string;
    correction_window_start?: string | null;
    correction_window_end?: string | null;
    date_confidence?: 'verified' | 'estimated' | 'tentative';
    date_source?: string;
    last_verified?: string;
  };
  
  eligibility: string;
  fee_structure: string;
  documents_required: string[];
  application_steps: string;
  
  application_guidance: {
    online_steps: string[];
    csc_applicable: boolean;
    csc_guidance: string;
    state_officials_applicable: boolean;
    state_officials_guidance: string;
    helpline: string;
    email: string;
    estimated_time: string;
  };
  
  deadline_reminders: Array<{
    days_before: number;
    message: string;
  }>;
  
  // For startup programs
  program_type?: 'grant' | 'seed_funding' | 'incubation' | 'accelerator' | 'policy_benefit' | 'tax_benefit';
  funding_amount?: string;
  sector?: string;
  stage?: string;
  state_specific?: string;
  success_rate?: 'High' | 'Medium' | 'Low';
  dpiit_required?: boolean;
  
  // For ambiguous queries (organization names)
  is_ambiguous?: boolean;
  organization_name?: string;
  active_opportunities?: Array<{
    title: string;
    description: string;
    application_status: string;
    deadline: string;
    category: string;
    url: string;
  }>;
  expired_opportunities?: Array<{...}>;
}
```

#### Features

- ✅ AI-powered extraction from official sources
- ✅ Web search integration for real-time data
- ✅ Date validation and confidence scoring
- ✅ Organization-level disambiguation
- ✅ Startup program detection and enrichment

#### Example: Query SSC Exam

```typescript
const { data, error } = await supabase.functions.invoke('process-query', {
  body: {
    query: 'SSC CGL 2025'
  }
});

console.log(data);
// {
//   title: 'SSC CGL Combined Graduate Level Examination 2025',
//   description: '...',
//   important_dates: {
//     application_start: '2025-05-16',
//     application_end: '2025-06-15',
//     ...
//   },
//   ...
// }
```

#### Example: Ambiguous Query

```typescript
const { data } = await supabase.functions.invoke('process-query', {
  body: { query: 'RRB' }
});

if (data.is_ambiguous) {
  console.log(data.organization_name); // 'Railway Recruitment Board'
  console.log(data.active_opportunities); // Array of active RRB exams
}
```

---

### translate-content

Translate content to Hindi or Kannada using Claude AI.

#### Endpoint

```
POST /functions/v1/translate-content
```

#### Request Body

```typescript
{
  text: string;              // Text to translate
  targetLanguage: 'hi' | 'kn'; // Target language
}
```

#### Response

```typescript
{
  translatedText: string;
}
```

#### Features

- ✅ Preserves government terminology
- ✅ Native script output (Devanagari/Kannada)
- ✅ Context-aware translation

#### Example

```typescript
const { data } = await supabase.functions.invoke('translate-content', {
  body: {
    text: 'Click here to apply for this scheme',
    targetLanguage: 'hi'
  }
});

console.log(data.translatedText);
// 'इस योजना के लिए आवेदन करने के लिए यहां क्लिक करें'
```

---

### generate-eligibility-quiz

Generate dynamic eligibility questionnaires for schemes and programs.

#### Endpoint

```
POST /functions/v1/generate-eligibility-quiz
```

#### Request Body

##### For Standard Programs

```typescript
{
  eligibility: string; // Eligibility criteria text
}
```

##### For Startup Programs (Generation)

```typescript
{
  programTitle: string;
  eligibility: string;
  sector?: string;
  stage?: string;
  fundingAmount?: string;
  dpiitRequired?: boolean;
}
```

##### For Analysis

```typescript
{
  eligibility: string;
  programTitle?: string;
  answers: Record<string, string>; // Question ID -> Answer
  analyze: true;
}
```

#### Response

##### Quiz Generation

```typescript
{
  quiz?: Array<{  // For standard programs
    id: string;
    question: string;
    requirement?: string;
    type: 'yes-no' | 'multiple-choice' | 'text';
    options?: string[];
  }>;
  
  questions?: Array<{  // For startup programs
    id: string;
    question: string;
    options: string[];
  }>;
}
```

##### Analysis Response

```typescript
{
  result: {
    eligible: boolean;
    matchedCriteria: string[];
    unmatchedCriteria: string[];
    suggestions: string[];
  };
}
```

#### Example: Generate Quiz

```typescript
const { data } = await supabase.functions.invoke('generate-eligibility-quiz', {
  body: {
    eligibility: 'Age: 18-27 years, Education: Graduate, Nationality: Indian'
  }
});

console.log(data.quiz);
// [
//   { id: 'q1', question: 'Are you an Indian citizen?', type: 'yes-no' },
//   { id: 'q2', question: 'What is your age?', type: 'text' },
//   ...
// ]
```

#### Example: Analyze Answers

```typescript
const { data } = await supabase.functions.invoke('generate-eligibility-quiz', {
  body: {
    eligibility: 'Age: 18-27, Graduate',
    answers: { q1: 'Yes', q2: '25', q3: 'Graduate' },
    analyze: true
  }
});

console.log(data.result);
// {
//   eligible: true,
//   matchedCriteria: ['Age requirement', 'Education requirement'],
//   unmatchedCriteria: [],
//   suggestions: ['Proceed with application']
// }
```

---

### chat-with-program

Interactive chat interface for program-specific queries.

#### Endpoint

```
POST /functions/v1/chat-with-program
```

#### Request Body

```typescript
{
  programContext: string;    // Program details for context
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  userMessage: string;       // Current user message
}
```

#### Response

```typescript
{
  response: string; // AI-generated response
}
```

#### Features

- ✅ Conversation history awareness
- ✅ Program-specific context
- ✅ Natural language responses

#### Example

```typescript
const { data } = await supabase.functions.invoke('chat-with-program', {
  body: {
    programContext: 'Startup India Seed Fund - Provides up to ₹50 lakh funding',
    conversationHistory: [],
    userMessage: 'What documents do I need to apply?'
  }
});

console.log(data.response);
// 'For Startup India Seed Fund, you need: 1. DPIIT Certificate...'
```

---

### find-category-schemes

Find schemes/exams by category.

#### Endpoint

```
POST /functions/v1/find-category-schemes
```

#### Request Body

```typescript
{
  category: string; // Category name (e.g., 'Students', 'Jobs', 'Startups')
}
```

#### Response

```typescript
{
  schemes: Array<{
    title: string;
    url: string;
    description: string;
    type: 'organization' | 'single_application';
  }>;
}
```

#### Features

- ✅ AI-curated results
- ✅ Official sources prioritized
- ✅ Organization vs. single application classification

#### Example

```typescript
const { data } = await supabase.functions.invoke('find-category-schemes', {
  body: { category: 'Students' }
});

console.log(data.schemes);
// [
//   { title: 'NEET 2025', url: 'https://neet.nta.nic.in', type: 'single_application' },
//   { title: 'SSC', url: 'https://ssc.nic.in', type: 'organization' },
//   ...
// ]
```

---

## Location & Availability Functions

### check-local-availability

Check if a program is available in user's location.

#### Endpoint

```
POST /functions/v1/check-local-availability
```

#### Request Body

```typescript
{
  programTitle: string;
  category?: string;
  state: string;
  district?: string;
  block?: string;
  userId?: string;
}
```

#### Response

```typescript
{
  results: Array<{
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
    lastVerified?: string;
    description?: string;
    howToApply?: string;
    sourceUrl?: string;
  }>;
  confidence: 'high' | 'medium' | 'low';
  helperText: string;
}
```

#### Example

```typescript
const { data } = await supabase.functions.invoke('check-local-availability', {
  body: {
    programTitle: 'PM Kisan Yojana',
    state: 'Karnataka',
    district: 'Bangalore Urban'
  }
});

console.log(data);
// {
//   results: [{
//     title: 'PM Kisan Yojana',
//     scope: 'national',
//     mode: 'online',
//     confidence: 'verified',
//     ...
//   }],
//   confidence: 'high',
//   helperText: 'Found 1 verified program in your state'
// }
```

---

### find-nearest-csc

Find nearest Common Service Centers.

#### Endpoint

```
POST /functions/v1/find-nearest-csc
```

#### Request Body

```typescript
{
  state: string;
  district?: string;
  block?: string;
  latitude?: number;
  longitude?: number;
}
```

#### Response

```typescript
{
  centers: Array<{
    name: string;
    address: string;
    phone?: string;
    email?: string;
    distance?: number; // in km
  }>;
}
```

---

## Discovery & News Functions

### get-discovery-feed

Fetch personalized discovery feed.

#### Endpoint

```
POST /functions/v1/get-discovery-feed
```

#### Request Body

```typescript
{
  userId?: string;
  category?: string;
  limit?: number;
  offset?: number;
}
```

#### Response

```typescript
{
  stories: Array<{
    id: string;
    headline: string;
    summary: string;
    category: string;
    source_name: string;
    source_url: string;
    image_url?: string;
    published_at: string;
    view_count: number;
    engagement_score: number;
  }>;
  hasMore: boolean;
}
```

---

### generate-audio-news-bulletin

Generate AI-narrated audio news bulletin.

#### Endpoint

```
POST /functions/v1/generate-audio-news-bulletin
```

#### Request Body

```typescript
{
  language?: 'hi' | 'bh';
  storyIds?: string[];
}
```

#### Response

```typescript
{
  bulletinId: string;
  audioUrl: string;
  duration: number;
  title: string;
}
```

---

### track-story-interaction

Track user interactions with stories.

#### Endpoint

```
POST /functions/v1/track-story-interaction
```

#### Request Body

```typescript
{
  story_id: string;
  interaction_type: 'view' | 'click_source' | 'save' | 'share';
  read_duration_seconds?: number;
}
```

#### Response

```typescript
{
  success: boolean;
}
```

---

## Application Management Functions

### find-active-applications

Find user's active applications.

#### Endpoint

```
POST /functions/v1/find-active-applications
```

#### Request Body

```typescript
{
  userId: string;
  status?: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';
}
```

#### Response

```typescript
{
  applications: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    deadline: string;
    created_at: string;
  }>;
}
```

---

### update-application-status

Update application status.

#### Endpoint

```
POST /functions/v1/update-application-status
```

#### Request Body

```typescript
{
  applicationId: string;
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';
  notes?: string;
}
```

---

### track-application-view

Track application views for analytics.

#### Endpoint

```
POST /functions/v1/track-application-view
```

#### Request Body

```typescript
{
  applicationId: string;
  userId?: string;
}
```

---

## Notification Functions

### send-push-notification

Send push notification to user.

#### Endpoint

```
POST /functions/v1/send-push-notification
```

#### Request Body

```typescript
{
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}
```

---

### schedule-notifications

Schedule deadline reminders.

#### Endpoint

```
POST /functions/v1/schedule-notifications
```

#### Request Body

```typescript
{
  applicationId: string;
  deadline: string; // ISO 8601 date
  reminders: Array<{
    days_before: number;
    message: string;
  }>;
}
```

---

## Shared Utilities

### claude-client

Centralized Claude AI client for all edge functions.

#### Import

```typescript
import { callClaude, logClaudeUsage } from "../_shared/claude-client.ts";
```

#### callClaude Function

```typescript
async function callClaude(options: {
  systemPrompt: string;
  userPrompt: string;
  enableWebSearch?: boolean;
  maxWebSearchUses?: number;
  forceWebSearch?: boolean;
  temperature?: number;
  maxTokens?: number;
}): Promise<{
  content: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  stopReason: string;
  webSearchUsed?: boolean;
}>
```

#### Features

- ✅ Claude Sonnet 4.5 integration
- ✅ Native web search tool support
- ✅ Automatic retry with exponential backoff
- ✅ Token usage tracking
- ✅ Cost estimation

#### Example

```typescript
const response = await callClaude({
  systemPrompt: 'You are a helpful assistant',
  userPrompt: 'Tell me about SSC CGL',
  enableWebSearch: true,
  maxWebSearchUses: 5,
  temperature: 0.3
});

console.log(response.content);
logClaudeUsage('my-function', response.tokensUsed, response.webSearchUsed);
```

#### Pricing (Claude Sonnet 4.5)

- **Input**: $3 per million tokens
- **Output**: $15 per million tokens

---

## Error Handling

All edge functions follow consistent error handling:

### Error Response Format

```typescript
{
  error: string;           // Error message
  details?: string;        // Additional details
  code?: string | number;  // Error code
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Request completed |
| 400 | Bad Request | Missing required parameters |
| 401 | Unauthorized | Invalid or missing auth token |
| 429 | Rate Limited | Too many requests |
| 500 | Server Error | Internal function error |

### Example Error Handling

```typescript
try {
  const { data, error } = await supabase.functions.invoke('process-query', {
    body: { query: 'SSC CGL' }
  });
  
  if (error) throw error;
  
  console.log(data);
} catch (error) {
  if (error.message.includes('Rate limit')) {
    // Handle rate limiting
    console.log('Too many requests, please wait');
  } else if (error.message.includes('404')) {
    // Handle not found
    console.log('Resource not found');
  } else {
    // General error
    console.error('Error:', error.message);
  }
}
```

---

## Best Practices

### 1. Use Appropriate Timeouts

```typescript
const { data, error } = await Promise.race([
  supabase.functions.invoke('process-query', { body: { query } }),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 30000)
  )
]);
```

### 2. Cache Responses

```typescript
// Cache AI responses to reduce costs
const cacheKey = `query-${query}`;
const cached = localStorage.getItem(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const { data } = await supabase.functions.invoke('process-query', {
  body: { query }
});

localStorage.setItem(cacheKey, JSON.stringify(data));
```

### 3. Handle Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);

const fetchData = async () => {
  setIsLoading(true);
  try {
    const { data } = await supabase.functions.invoke('function-name', {
      body: params
    });
    // Handle data
  } finally {
    setIsLoading(false);
  }
};
```

### 4. Validate Input

```typescript
if (!query || query.trim().length === 0) {
  toast({
    variant: 'destructive',
    title: 'Error',
    description: 'Please enter a search query'
  });
  return;
}

const { data } = await supabase.functions.invoke('process-query', {
  body: { query: query.trim() }
});
```

### 5. Monitor Costs

Web search is expensive. Use it judiciously:

```typescript
// ✅ Good: Use web search for queries needing current data
await callClaude({
  systemPrompt: 'Find current exam dates',
  userPrompt: query,
  enableWebSearch: true,
  maxWebSearchUses: 5
});

// ❌ Bad: Use web search for static data
await callClaude({
  systemPrompt: 'Translate this text',
  userPrompt: text,
  enableWebSearch: true  // Unnecessary
});
```

---

## Performance Tips

1. **Parallel Requests**: For independent queries, use `Promise.all()`
2. **Batch Operations**: Combine multiple similar requests
3. **Optimize Prompts**: Shorter prompts = lower costs
4. **Cache Aggressively**: Store results in localStorage/database
5. **Use Appropriate Temperature**: Lower = faster & cheaper

---

## Testing Edge Functions

### Local Testing

```bash
# Install Supabase CLI
npm install -g supabase

# Start local functions
supabase functions serve process-query

# Test with curl
curl -X POST http://localhost:54321/functions/v1/process-query \
  -H "Content-Type: application/json" \
  -d '{"query":"SSC CGL 2025"}'
```

### Unit Testing

```typescript
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

Deno.test("process-query returns valid response", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ query: "SSC CGL" })
  });
  
  const res = await handler(req);
  const data = await res.json();
  
  assertEquals(res.status, 200);
  assertEquals(typeof data.title, "string");
});
```

---

## Rate Limits

### Claude AI Limits

- **Tier 1**: 50,000 tokens/minute
- **Tier 2**: 400,000 tokens/minute
- **Web Search**: 10 searches per request max

### Supabase Limits

- **Free**: 500,000 function invocations/month
- **Pro**: 2,000,000 invocations/month

---

## Security

### API Key Management

```typescript
// ✅ Good: Use environment variables
const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

// ❌ Bad: Hardcoded keys
const apiKey = "sk-ant-..."; // Never do this!
```

### Input Validation

```typescript
// Sanitize user input
const sanitizedQuery = query.trim().substring(0, 1000);

// Validate required fields
if (!programTitle || !state) {
  return new Response(
    JSON.stringify({ error: 'Missing required fields' }),
    { status: 400 }
  );
}
```

---

## Support

For issues with edge functions:
1. Check function logs in Supabase dashboard
2. Verify environment variables are set
3. Test with minimal examples
4. Review Claude API quotas
5. Contact the development team

---

## Changelog

### Version 1.0.0 (Current)
- Initial release with 30+ edge functions
- Claude Sonnet 4.5 integration
- Web search capabilities
- Multi-language support
- Audio news bulletins
- Location-based services

---

## Related Documentation

- [Custom Hooks API](./HOOKS_API.md)
- [Utilities API](./UTILITIES_API.md)
- [Components API](./COMPONENTS_API.md)
- [Main API Documentation](./API_DOCUMENTATION.md)
