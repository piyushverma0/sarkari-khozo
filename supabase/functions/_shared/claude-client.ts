// Shared Claude API client with web search support
// Model: Claude Sonnet 4.5

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

interface ClaudeCallOptions {
  systemPrompt: string
  userPrompt: string
  enableWebSearch?: boolean
  maxWebSearchUses?: number
  forceWebSearch?: boolean
  temperature?: number
  maxTokens?: number
}

interface ClaudeResponse {
  content: string
  tokensUsed: {
    input: number
    output: number
  }
  webSearchUsed: boolean
}

export async function callClaude(options: ClaudeCallOptions): Promise<ClaudeResponse> {
  const {
    systemPrompt,
    userPrompt,
    enableWebSearch = false,
    maxWebSearchUses = 10,
    forceWebSearch = false,
    temperature = 0.3,
    maxTokens = 4096,
  } = options

  const tools = enableWebSearch ? [{
    type: 'web_search_20250305',
    name: 'web_search',
    max_uses: maxWebSearchUses,
  }] : []

  const requestBody: any = {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  }

  if (tools.length > 0) {
    requestBody.tools = tools
    if (forceWebSearch) {
      requestBody.tool_choice = { type: 'any' }
    }
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Claude API error:', error)
    throw new Error(`Claude API error: ${error}`)
  }

  const data = await response.json()

  // Extract text content
  let finalContent = ''
  let webSearchUsed = false

  if (data.content) {
    for (const block of data.content) {
      if (block.type === 'text') {
        finalContent += block.text
      }
    }
  }

  // Check if web search was used
  if (data.stop_reason === 'tool_use' || data.stop_reason === 'end_turn') {
    webSearchUsed = data.content?.some((block: any) => block.type === 'tool_use') || false
  }

  return {
    content: finalContent,
    tokensUsed: {
      input: data.usage?.input_tokens || 0,
      output: data.usage?.output_tokens || 0,
    },
    webSearchUsed,
  }
}

export function logClaudeUsage(
  functionName: string,
  tokensUsed: { input: number; output: number },
  webSearchUsed: boolean
) {
  console.log(`[${functionName}] Claude usage:`, {
    inputTokens: tokensUsed.input,
    outputTokens: tokensUsed.output,
    totalTokens: tokensUsed.input + tokensUsed.output,
    webSearchUsed,
  })
}
