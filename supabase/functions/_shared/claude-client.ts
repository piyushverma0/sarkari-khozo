export interface ClaudeCallOptions {
  systemPrompt: string;
  userPrompt: string;
  enableWebSearch?: boolean;
  maxWebSearchUses?: number;
  forceWebSearch?: boolean; // Force Claude to use web search tool
  temperature?: number;
  maxTokens?: number;
}

export interface ClaudeResponse {
  content: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  stopReason: string;
  webSearchUsed?: boolean;
}

/**
 * Centralized Claude API client with native web search capabilities
 * Uses Claude Sonnet 4.5's built-in web_search tool
 */
export async function callClaude(options: ClaudeCallOptions): Promise<ClaudeResponse> {
  const {
    systemPrompt,
    userPrompt,
    enableWebSearch = false,
    maxWebSearchUses = 5,
    forceWebSearch = false,
    temperature = 0.3,
    maxTokens = 4096,
  } = options;

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  // Build the request payload
  const requestPayload: any = {
    model: "claude-sonnet-4-5",
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  };

  // Add Claude's native web search tool if enabled
  if (enableWebSearch) {
    requestPayload.tools = [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: maxWebSearchUses,
      },
    ];
    
    // Force web search usage if requested
    if (forceWebSearch) {
      requestPayload.tool_choice = {
        type: "tool",
        name: "web_search",
      };
    }
  }

  try {
    // Call Claude API with retry logic
    const response = await callWithRetry(async () => {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestPayload),
      });

      if (!res.ok) {
        const error: any = new Error(`HTTP ${res.status}: ${res.statusText}`);
        error.status = res.status;
        throw error;
      }

      return await res.json();
    });

    // Extract text content from response
    const textContent = response.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("\n");

    // Check if web search was actually used
    const webSearchUsed = response.content.some(
      (block: any) => block.type === "tool_use" && block.name === "web_search"
    );

    return {
      content: textContent,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      stopReason: response.stop_reason,
      webSearchUsed,
    };
  } catch (error: any) {
    // Handle specific error types
    if (error.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (error.status === 402) {
      throw new Error("Insufficient credits. Please add funds to your Anthropic account.");
    }
    if (error.status === 401) {
      throw new Error("Invalid API key. Please check your ANTHROPIC_API_KEY.");
    }
    
    console.error("Claude API error:", error);
    throw new Error(`Claude API error: ${error.message || "Unknown error"}`);
  }
}

/**
 * Streaming version of callClaude for chat interfaces
 * Returns an async generator that yields text chunks
 */
export async function* callClaudeStream(options: ClaudeCallOptions): AsyncGenerator<string> {
  const {
    systemPrompt,
    userPrompt,
    enableWebSearch = false,
    maxWebSearchUses = 5,
    temperature = 0.3,
    maxTokens = 4096,
  } = options;

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const requestPayload: any = {
    model: "claude-sonnet-4-5",
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    stream: true,
  };

  if (enableWebSearch) {
    requestPayload.tools = [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: maxWebSearchUses,
      },
    ];
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);
            if (
              event.type === "content_block_delta" &&
              event.delta?.type === "text_delta"
            ) {
              yield event.delta.text;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  } catch (error: any) {
    if (error.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (error.status === 402) {
      throw new Error("Insufficient credits. Please add funds to your Anthropic account.");
    }
    
    console.error("Claude streaming error:", error);
    throw new Error(`Claude streaming error: ${error.message || "Unknown error"}`);
  }
}

/**
 * Retry logic for API calls with exponential backoff
 */
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx except 429)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Helper to estimate cost of a Claude API call
 */
export function estimateCost(tokensUsed: { input: number; output: number }): number {
  // Claude Sonnet 4.5 pricing (as of 2025)
  // Input: $3 per million tokens
  // Output: $15 per million tokens
  const inputCost = (tokensUsed.input / 1_000_000) * 3;
  const outputCost = (tokensUsed.output / 1_000_000) * 15;
  return inputCost + outputCost;
}

/**
 * Log API usage for monitoring
 */
export async function logClaudeUsage(
  functionName: string,
  tokensUsed: { input: number; output: number },
  webSearchUsed: boolean
) {
  const cost = estimateCost(tokensUsed);
  console.log(
    `[${functionName}] Claude API usage:`,
    JSON.stringify({
      model: "claude-sonnet-4-5",
      tokensIn: tokensUsed.input,
      tokensOut: tokensUsed.output,
      cost: `$${cost.toFixed(4)}`,
      webSearchUsed,
      timestamp: new Date().toISOString(),
    })
  );
}
