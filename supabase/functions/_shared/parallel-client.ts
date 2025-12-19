/**
 * Parallel AI Client
 *
 * Provides a unified interface for calling Parallel AI's chat completion API
 * with web search capabilities for news scraping and story processing.
 */

interface ParallelMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ParallelResponse {
  content: string;
  webSearchUsed: boolean;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
}

interface CallParallelOptions {
  systemPrompt: string;
  userPrompt: string;
  enableWebSearch?: boolean;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  jsonSchema?: object;
}

/**
 * Call Parallel AI with the given prompts and options
 */
export async function callParallel({
  systemPrompt,
  userPrompt,
  enableWebSearch = false,
  maxTokens = 2000,
  temperature = 0.3,
  jsonMode = false,
  jsonSchema
}: CallParallelOptions): Promise<ParallelResponse> {

  const apiKey = Deno.env.get('PARALLEL_API_KEY');
  if (!apiKey) {
    throw new Error('PARALLEL_API_KEY environment variable not set. Please set it in Supabase Edge Functions secrets.');
  }

  const messages: ParallelMessage[] = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: userPrompt
    }
  ];

  const requestBody: any = {
    model: 'lite', // Parallel's lite model for simple lookups and research with basis support
    messages: messages,
    max_tokens: maxTokens,
    temperature: temperature
  };

  // Enable JSON mode if requested
  if (jsonMode && jsonSchema) {
    requestBody.response_format = {
      type: 'json_schema',
      json_schema: jsonSchema
    };
  } else if (jsonMode) {
    requestBody.response_format = {
      type: 'json_object'
    };
  }

  // Enable web search if requested
  // Note: Parallel AI's web search is enabled via system prompt instructions
  // We'll add search instructions to the system prompt
  if (enableWebSearch) {
    messages[0].content = `${systemPrompt}\n\nIMPORTANT: Use web search to find the latest information from reliable sources.`;
  }

  console.log('📞 Calling Parallel AI API...');
  console.log('🔍 Web search enabled:', enableWebSearch);
  console.log('📝 Max tokens:', maxTokens);

  try {
    const response = await fetch('https://api.parallel.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Parallel API error:', response.status, errorText);

      // Provide helpful error messages
      if (response.status === 401) {
        throw new Error(`Parallel API authentication failed. Please check your PARALLEL_API_KEY in Supabase Edge Functions secrets. Error: ${errorText}`);
      } else if (response.status === 429) {
        throw new Error(`Parallel API rate limit exceeded. Please try again later.`);
      }

      throw new Error(`Parallel API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Extract content from response
    const content = data.choices[0]?.message?.content || '';

    // Extract token usage
    const tokensUsed = {
      prompt: data.usage?.prompt_tokens || 0,
      completion: data.usage?.completion_tokens || 0,
      total: data.usage?.total_tokens || 0
    };

    console.log('✅ Parallel AI response received');
    console.log('📊 Tokens used:', tokensUsed.total);

    return {
      content,
      webSearchUsed: enableWebSearch,
      tokensUsed
    };

  } catch (error) {
    console.error('❌ Failed to call Parallel AI:', error);
    throw error;
  }
}

/**
 * Log Parallel AI usage to database for tracking
 */
export async function logParallelUsage(
  functionName: string,
  tokensUsed: { prompt: number; completion: number; total: number },
  webSearchUsed: boolean
): Promise<void> {
  try {
    // This is a placeholder - implement actual usage logging if needed
    console.log(`📈 [${functionName}] Parallel AI Usage:`, {
      tokens: tokensUsed.total,
      webSearch: webSearchUsed
    });
  } catch (error) {
    console.error('Failed to log Parallel usage:', error);
    // Don't throw - logging failure shouldn't break the main flow
  }
}
