// Shared AI client with intelligent fallback strategy:
// - Text: Sonar Pro → GPT-4-turbo
// - Files: Sonar Pro (base64) → GPT-4o (base64, PDF/DOCX only)
// All file processing uses base64 encoding to ensure reliability

const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

/**
 * Convert ArrayBuffer to base64 with chunking to avoid stack overflow
 * Uses 8KB chunks to safely process large files
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  let binaryString = "";
  const chunkSize = 8192; // 8KB chunks - safe for String.fromCharCode.apply()

  // Process in chunks to avoid "Maximum call stack size exceeded" error
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
    binaryString += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binaryString);
}

interface AICallOptions {
  systemPrompt: string;
  userPrompt: string;
  enableWebSearch?: boolean;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
}

interface AIFileUploadOptions {
  systemPrompt: string;
  userPrompt: string;
  fileBuffer: ArrayBuffer;
  mimeType: string;
  displayName: string;
  fileUrl?: string; // Optional: Public URL to file (avoids base64 encoding overhead)
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
}

interface AIResponse {
  content: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  webSearchUsed: boolean;
  modelUsed: "sonar-pro" | "gpt-4-turbo" | "gpt-4o";
}

/**
 * Call AI with automatic fallback: Sonar Pro → GPT-4-turbo
 */
export async function callAI(options: AICallOptions): Promise<AIResponse> {
  const {
    systemPrompt,
    userPrompt,
    enableWebSearch = false,
    temperature = 0.3,
    maxTokens = 4096,
    responseFormat = "text",
  } = options;

  // Try Sonar Pro first
  try {
    console.log("🔵 Trying Sonar Pro...");
    const response = await callSonarPro({
      systemPrompt,
      userPrompt,
      enableWebSearch,
      temperature,
      maxTokens,
      responseFormat,
    });
    console.log("✅ Sonar Pro succeeded");
    return response;
  } catch (sonarError) {
    console.warn("⚠️ Sonar Pro failed:", sonarError instanceof Error ? sonarError.message : String(sonarError));
    console.log("🟢 Falling back to GPT-4-turbo...");

    // Fallback to GPT-4-turbo
    try {
      const response = await callGPT4Turbo({
        systemPrompt,
        userPrompt,
        enableWebSearch,
        temperature,
        maxTokens,
        responseFormat,
      });
      console.log("✅ GPT-4-turbo succeeded");
      return response;
    } catch (gptError) {
      console.error("❌ GPT-4-turbo also failed:", gptError instanceof Error ? gptError.message : String(gptError));
      throw new Error(
        `Both AI models failed. Sonar: ${sonarError instanceof Error ? sonarError.message : String(sonarError)}, GPT-4: ${gptError instanceof Error ? gptError.message : String(gptError)}`,
      );
    }
  }
}

/**
 * Call AI with file upload - tries Sonar Pro (base64) → GPT-4o (base64 for PDF/DOCX only)
 */
export async function callAIWithFile(options: AIFileUploadOptions): Promise<AIResponse> {
  const {
    systemPrompt,
    userPrompt,
    fileBuffer,
    mimeType,
    displayName,
    fileUrl,
    temperature = 0.3,
    maxTokens = 8192,
    responseFormat = "text",
  } = options;

  // Try Sonar Pro with base64 upload first
  try {
    console.log("🔵 Trying Sonar Pro with file...");
    const response = await callSonarProWithFile({
      systemPrompt,
      userPrompt,
      fileBuffer,
      mimeType,
      displayName,
      fileUrl,
      temperature,
      maxTokens,
      responseFormat,
    });
    console.log("✅ Sonar Pro file processing succeeded");
    return response;
  } catch (sonarError) {
    console.warn(
      "⚠️ Sonar Pro file processing failed:",
      sonarError instanceof Error ? sonarError.message : String(sonarError),
    );

    // Check if this is a PDF or DOCX file - if so, try GPT-4o with base64
    const isPDF = mimeType === "application/pdf";
    const isDOCX = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (isPDF || isDOCX) {
      console.log("🟢 Falling back to GPT-4o with base64 for PDF/DOCX...");
      try {
        const response = await callGPT4oWithBase64File({
          systemPrompt,
          userPrompt,
          fileBuffer,
          mimeType,
          displayName,
          temperature,
          maxTokens,
          responseFormat,
        });
        console.log("✅ GPT-4o file processing succeeded");
        return response;
      } catch (gptError) {
        console.error("❌ GPT-4o also failed:", gptError instanceof Error ? gptError.message : String(gptError));
        throw new Error(
          `Both AI models failed to process file. Sonar Pro: ${sonarError instanceof Error ? sonarError.message : String(sonarError)}, GPT-4o: ${gptError instanceof Error ? gptError.message : String(gptError)}`,
        );
      }
    } else {
      // For non-PDF/DOCX files, only Sonar Pro is supported
      throw new Error(
        `File processing failed with Sonar Pro: ${sonarError instanceof Error ? sonarError.message : String(sonarError)}. GPT-4o fallback is only available for PDF and DOCX files.`,
      );
    }
  }
}

/**
 * Call Sonar Pro (Perplexity AI)
 */
async function callSonarPro(options: AICallOptions): Promise<AIResponse> {
  const { systemPrompt, userPrompt, enableWebSearch, temperature, maxTokens, responseFormat } = options;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const requestBody: any = {
    model: "sonar-pro",
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  // Enable web search if requested (no domain filter = search all domains)
  if (enableWebSearch) {
    requestBody.search_recency_filter = "month"; // Recent results
  }

  // Note: Sonar Pro doesn't support response_format parameter
  // We rely on prompt engineering to get JSON output

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sonar Pro API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    tokensUsed: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
    },
    webSearchUsed: enableWebSearch || false,
    modelUsed: "sonar-pro",
  };
}

/**
 * Call Sonar Pro with file (base64 encoded)
 * Note: Public URLs don't work reliably - Sonar Pro cannot access Supabase storage URLs
 * Base64 encoding ensures the file content is actually sent and read
 */
async function callSonarProWithFile(options: AIFileUploadOptions): Promise<AIResponse> {
  const { systemPrompt, userPrompt, fileBuffer, mimeType, temperature, maxTokens, responseFormat } = options;

  // Always use base64 encoding for Sonar Pro
  // Public URLs don't work - Sonar Pro hallucinates content instead of reading the file
  console.log("📎 Converting file to base64 for Sonar Pro (ensures file is actually read)");
  const base64 = arrayBufferToBase64(fileBuffer);
  const fileDataUrl = `data:${mimeType};base64,${base64}`;

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        {
          type: "file_url", // Changed from 'image_url' - Sonar Pro expects 'file_url' for documents
          file_url: { url: fileDataUrl },
        },
        {
          type: "text",
          text: userPrompt,
        },
      ],
    },
  ];

  const requestBody: any = {
    model: "sonar-pro",
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  // Note: Sonar Pro doesn't support response_format parameter
  // We rely on prompt engineering to get JSON output

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sonar Pro file API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    tokensUsed: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
    },
    webSearchUsed: false,
    modelUsed: "sonar-pro",
  };
}

/**
 * Call GPT-4-turbo (OpenAI)
 */
async function callGPT4Turbo(options: AICallOptions): Promise<AIResponse> {
  const { systemPrompt, userPrompt, enableWebSearch, temperature, maxTokens, responseFormat } = options;

  // If web search was requested, modify the prompt to acknowledge GPT-4 can't search
  // but should provide best available information
  let modifiedUserPrompt = userPrompt;
  if (enableWebSearch) {
    modifiedUserPrompt = userPrompt
      .replace(
        /CRITICAL: You MUST use web_search.*?\./g,
        "NOTE: Provide the most accurate information based on your training data.",
      )
      .replace(/Use web_search to find.*?\./g, "Use your knowledge to provide the best available information.")
      .replace(/web_search/g, "your knowledge");
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: modifiedUserPrompt },
  ];

  const requestBody: any = {
    model: "gpt-4-turbo-preview",
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (responseFormat === "json") {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GPT-4-turbo API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    tokensUsed: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
    },
    webSearchUsed: false,
    modelUsed: "gpt-4-turbo",
  };
}

/**
 * Call GPT-4o with file using base64 encoding (for PDF/DOCX)
 * Uses vision API format to pass base64 encoded files
 */
async function callGPT4oWithBase64File(options: AIFileUploadOptions): Promise<AIResponse> {
  const { systemPrompt, userPrompt, fileBuffer, mimeType, temperature, maxTokens, responseFormat } = options;

  console.log("📎 Converting file to base64 for GPT-4o");
  const base64 = arrayBufferToBase64(fileBuffer);
  const fileDataUrl = `data:${mimeType};base64,${base64}`;

  // GPT-4o supports vision API format for file processing
  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        {
          type: "image_url", // GPT-4o uses image_url type even for PDFs
          image_url: {
            url: fileDataUrl,
          },
        },
        {
          type: "text",
          text: userPrompt,
        },
      ],
    },
  ];

  const requestBody: any = {
    model: "gpt-4o",
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (responseFormat === "json") {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GPT-4o file API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    tokensUsed: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
    },
    webSearchUsed: false,
    modelUsed: "gpt-4o",
  };
}

/**
 * Call GPT-4-turbo with file using Files API
 */
async function callGPT4TurboWithFile(options: AIFileUploadOptions): Promise<AIResponse> {
  const { systemPrompt, userPrompt, fileBuffer, mimeType, displayName, temperature, maxTokens, responseFormat } =
    options;

  // Step 1: Upload file to OpenAI Files API
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  formData.append("file", blob, displayName);
  formData.append("purpose", "assistants");

  const uploadResponse = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`GPT-4 file upload error (${uploadResponse.status}): ${errorText}`);
  }

  const uploadData = await uploadResponse.json();
  const fileId = uploadData.id;

  console.log(`📎 File uploaded to OpenAI: ${fileId}`);

  // Wait a moment for file processing
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Step 2: Use file in chat completion with gpt-4-turbo (supports file references)
  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `File ID: ${fileId}\n\n${userPrompt}`,
        },
      ],
    },
  ];

  const requestBody: any = {
    model: "gpt-4-turbo-preview",
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (responseFormat === "json") {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GPT-4-turbo file processing error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Clean up: Delete the uploaded file
  try {
    await fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });
    console.log(`🗑️ Deleted file: ${fileId}`);
  } catch (deleteError) {
    console.warn("Failed to delete uploaded file:", deleteError);
  }

  return {
    content: data.choices[0].message.content,
    tokensUsed: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
    },
    webSearchUsed: false,
    modelUsed: "gpt-4-turbo",
  };
}

/**
 * Log AI usage for monitoring
 */
export function logAIUsage(
  functionName: string,
  tokensUsed: { input: number; output: number },
  webSearchUsed: boolean,
  modelUsed: "sonar-pro" | "gpt-4-turbo" | "gpt-4o",
) {
  console.log(`[${functionName}] AI usage:`, {
    model: modelUsed,
    inputTokens: tokensUsed.input,
    outputTokens: tokensUsed.output,
    totalTokens: tokensUsed.input + tokensUsed.output,
    webSearchUsed,
  });
}
