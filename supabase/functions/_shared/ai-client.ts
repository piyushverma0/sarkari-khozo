// Shared AI client with Sonar Pro (primary) and GPT-4-turbo (fallback)
// Supports web search and file processing

const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

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
  modelUsed: "sonar-pro" | "gpt-4-turbo";
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
 * Call AI with file upload - tries Sonar Pro (base64) → GPT-4-turbo (Files API)
 */
export async function callAIWithFile(options: AIFileUploadOptions): Promise<AIResponse> {
  const {
    systemPrompt,
    userPrompt,
    fileBuffer,
    mimeType,
    displayName,
    temperature = 0.3,
    maxTokens = 8192,
    responseFormat = "text",
  } = options;

  // Try Sonar Pro with base64 file upload
  try {
    console.log("🔵 Trying Sonar Pro with file...");
    const response = await callSonarProWithFile({
      systemPrompt,
      userPrompt,
      fileBuffer,
      mimeType,
      displayName,
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
    console.log("🟢 Falling back to GPT-4-turbo with file...");

    // Fallback to GPT-4-turbo with Files API
    try {
      const response = await callGPT4TurboWithFile({
        systemPrompt,
        userPrompt,
        fileBuffer,
        mimeType,
        displayName,
        temperature,
        maxTokens,
        responseFormat,
      });
      console.log("✅ GPT-4-turbo file processing succeeded");
      return response;
    } catch (gptError) {
      console.error(
        "❌ GPT-4-turbo file processing also failed:",
        gptError instanceof Error ? gptError.message : String(gptError),
      );
      throw new Error(
        `Both AI models failed for file processing. Sonar: ${sonarError instanceof Error ? sonarError.message : String(sonarError)}, GPT-4: ${gptError instanceof Error ? gptError.message : String(gptError)}`,
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

  // Enable web search if requested
  if (enableWebSearch) {
    requestBody.search_domain_filter = ["*"]; // Search all domains
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
 */
async function callSonarProWithFile(options: AIFileUploadOptions): Promise<AIResponse> {
  const { systemPrompt, userPrompt, fileBuffer, mimeType, temperature, maxTokens, responseFormat } = options;

  // Convert file to base64
  const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: dataUrl },
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
  modelUsed: "sonar-pro" | "gpt-4-turbo",
) {
  console.log(`[${functionName}] AI usage:`, {
    model: modelUsed,
    inputTokens: tokensUsed.input,
    outputTokens: tokensUsed.output,
    totalTokens: tokensUsed.input + tokensUsed.output,
    webSearchUsed,
  });
}
