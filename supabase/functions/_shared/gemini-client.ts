// Shared Gemini API client with file upload and web grounding support
// Model: Gemini 2.0 Flash Experimental

const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY')!

interface GeminiCallOptions {
  systemPrompt: string
  userPrompt: string
  enableWebSearch?: boolean
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json'
}

interface GeminiFileUploadOptions {
  systemPrompt: string
  userPrompt: string
  fileBuffer: ArrayBuffer
  mimeType: string
  displayName: string
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json'
}

interface GeminiResponse {
  content: string
  tokensUsed: {
    input: number
    output: number
  }
  webSearchUsed: boolean
}

// Upload file to Gemini File API
async function uploadFileToGemini(
  fileBuffer: ArrayBuffer,
  mimeType: string,
  displayName: string
): Promise<string> {
  console.log('Uploading file to Gemini:', displayName, mimeType)

  // Convert ArrayBuffer to Uint8Array
  const fileData = new Uint8Array(fileBuffer)

  // Create form data
  const formData = new FormData()
  const blob = new Blob([fileData], { type: mimeType })
  formData.append('file', blob, displayName)

  // Upload to Gemini File API
  const uploadResponse = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      body: formData,
    }
  )

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text()
    console.error('Gemini file upload error:', error)
    throw new Error(`Failed to upload file to Gemini: ${error}`)
  }

  const uploadData = await uploadResponse.json()
  console.log('File uploaded successfully:', uploadData.file.uri)

  // Return the file URI
  return uploadData.file.uri
}

// Call Gemini with text-only input
export async function callGemini(options: GeminiCallOptions): Promise<GeminiResponse> {
  const {
    systemPrompt,
    userPrompt,
    enableWebSearch = false,
    temperature = 0.3,
    maxTokens = 8192,
    responseFormat = 'text',
  } = options

  // Build the combined prompt
  const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`

  // Build generation config
  const generationConfig: any = {
    temperature,
    maxOutputTokens: maxTokens,
  }

  // Add JSON response format if requested
  if (responseFormat === 'json') {
    generationConfig.responseMimeType = 'application/json'
  }

  // Build tools for web search
  const tools: any[] = []
  if (enableWebSearch) {
    tools.push({ google_search: {} })
  }

  // Call Gemini API
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: combinedPrompt,
              },
            ],
          },
        ],
        generationConfig,
        tools: tools.length > 0 ? tools : undefined,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('Gemini API error:', error)
    throw new Error(`Gemini API error: ${error}`)
  }

  const data = await response.json()

  // Extract text content
  let finalContent = ''
  let webSearchUsed = false

  if (data.candidates && data.candidates[0]?.content?.parts) {
    for (const part of data.candidates[0].content.parts) {
      if (part.text) {
        finalContent += part.text
      }
    }
  }

  // Check if web search was used (Gemini includes groundingMetadata when search is used)
  if (data.candidates?.[0]?.groundingMetadata) {
    webSearchUsed = true
  }

  return {
    content: finalContent,
    tokensUsed: {
      input: data.usageMetadata?.promptTokenCount || 0,
      output: data.usageMetadata?.candidatesTokenCount || 0,
    },
    webSearchUsed,
  }
}

// Call Gemini with file upload (for PDF, DOCX, Audio, etc.)
export async function callGeminiWithFile(
  options: GeminiFileUploadOptions
): Promise<GeminiResponse> {
  const {
    systemPrompt,
    userPrompt,
    fileBuffer,
    mimeType,
    displayName,
    temperature = 0.3,
    maxTokens = 8192,
    responseFormat = 'text',
  } = options

  // Step 1: Upload file to Gemini
  const fileUri = await uploadFileToGemini(fileBuffer, mimeType, displayName)

  // Step 2: Wait for file processing (Gemini needs time to process uploaded files)
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Step 3: Build the combined prompt
  const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`

  // Build generation config
  const generationConfig: any = {
    temperature,
    maxOutputTokens: maxTokens,
  }

  // Add JSON response format if requested
  if (responseFormat === 'json') {
    generationConfig.responseMimeType = 'application/json'
  }

  // Call Gemini with file reference
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                file_data: {
                  file_uri: fileUri,
                  mime_type: mimeType,
                },
              },
              {
                text: combinedPrompt,
              },
            ],
          },
        ],
        generationConfig,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('Gemini API error:', error)
    throw new Error(`Gemini API error: ${error}`)
  }

  const data = await response.json()

  // Extract text content
  let finalContent = ''

  if (data.candidates && data.candidates[0]?.content?.parts) {
    for (const part of data.candidates[0].content.parts) {
      if (part.text) {
        finalContent += part.text
      }
    }
  }

  return {
    content: finalContent,
    tokensUsed: {
      input: data.usageMetadata?.promptTokenCount || 0,
      output: data.usageMetadata?.candidatesTokenCount || 0,
    },
    webSearchUsed: false,
  }
}

export function logGeminiUsage(
  functionName: string,
  tokensUsed: { input: number; output: number },
  webSearchUsed: boolean
) {
  console.log(`[${functionName}] Gemini usage:`, {
    inputTokens: tokensUsed.input,
    outputTokens: tokensUsed.output,
    totalTokens: tokensUsed.input + tokensUsed.output,
    webSearchUsed,
  })
}
