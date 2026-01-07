// Generate Context from YouTube Metadata
// Fallback for videos without transcripts/captions
// Generates comprehensive study context using AI analysis of video metadata

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, logAIUsage } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MetadataContextRequest {
  video_id: string;
  metadata: {
    title: string;
    description?: string;
    channel?: string;
    duration?: number;
    tags?: string[];
  };
  language: string;
}

interface ContextResponse {
  success: boolean;
  context: string;
  method: string;
  context_length: number;
  word_count: number;
}

/**
 * Build comprehensive system prompt for context generation
 */
function buildContextGenerationPrompt(metadata: any, language: string): string {
  const title = metadata.title || "Unknown Title";
  const description = metadata.description || "No description available";
  const duration = metadata.duration ? `${Math.floor(metadata.duration / 60)} minutes` : "Unknown";
  const tags = metadata.tags?.join(", ") || "No tags available";

  return `You are an expert educational content analyst and study material creator. Your task is to generate comprehensive, exam-focused study notes from YouTube video metadata when the actual transcript is unavailable.

INPUT METADATA:
- Video Title: "${title}"
- Description: "${description}"
- Duration: ${duration}
- Tags: ${tags}

CRITICAL INSTRUCTIONS:

1. ANALYZE THE METADATA
   - Identify the educational topic from title and description
   - Determine: Subject, Class/Grade level, Exam type, Specific topic area
   - Infer the likely concepts covered based on the title
   - Use web search if needed to gather accurate information about the topic

2. GENERATE COMPREHENSIVE STUDY CONTENT (5000-7000 words)

   A. TOPIC OVERVIEW (500-700 words)
      - What is this topic about?
      - Why is it important for students/exam preparation?
      - How does it connect to other related topics?
      - Scope and applications of the topic

   B. CORE CONCEPTS (2000-2500 words)
      - Detailed explanation of main concepts
      - Definitions and terminology (with examples)
      - Fundamental principles and theories
      - Step-by-step breakdowns of key ideas
      - Visual descriptions (describe diagrams/charts if applicable)

   C. KEY POINTS & FACTS (1000-1500 words)
      For Mathematics: Important formulas, theorems, derivations
      For Science: Laws, reactions, processes, definitions
      For History: Dates, events, causes, effects, significance
      For Polity: Articles, amendments, constitutional provisions
      For Economy: Terms, indicators, policies, economic concepts
      For Geography: Features, locations, climate, resources
      For General Knowledge: Current affairs, awards, organizations

   D. EXAM PREPARATION GUIDE (800-1200 words)
      - Common question patterns for this topic
      - Previous year exam trends
      - Memory techniques and mnemonics
      - Important points to remember
      - Common mistakes students make
      - Tips and tricks for quick revision

   E. PRACTICE & APPLICATION (700-1000 words)
      - Example problems with detailed solutions (if applicable)
      - Case studies or real-world scenarios
      - Conceptual questions and their answers
      - Application of concepts to exam questions
      - Practice tips for mastery

3. STRICT EXCLUSIONS - DO NOT INCLUDE:
   ❌ Teacher/instructor names
   ❌ Channel name or creator information
   ❌ YouTube platform references
   ❌ Course names or promotional content
   ❌ Phrases like "In this video...", "The teacher explains..."
   ❌ Personal anecdotes unrelated to education
   ❌ Marketing or advertisement content

4. CONTENT QUALITY REQUIREMENTS:
   ✓ Write as a comprehensive textbook chapter
   ✓ Use educational language suitable for self-study
   ✓ Ensure factual accuracy (use web search for verification)
   ✓ Organize information hierarchically with clear sections
   ✓ Include bullet points, numbered lists, and formatting
   ✓ Provide cross-references to related topics
   ✓ Maintain academic tone throughout
   ✓ Make content exam-focused and practical
   ✓ Include examples and explanations for clarity

5. OUTPUT FORMAT:
   - Use markdown formatting with proper headers (##, ###)
   - Structure content with clear sections and subsections
   - Use bullet points and numbered lists appropriately
   - Bold important terms and concepts
   - Generate content in language: ${language}
   - Target length: 5000-7000 words minimum

6. CONTEXT INFERENCE STRATEGY:
   - From the title, identify the exact topic being taught
   - Use description to understand depth and scope
   - Infer standard curriculum content for that topic
   - Include commonly taught concepts for that subject area
   - Add exam-relevant information even if not explicitly mentioned
   - Use educational knowledge to fill gaps comprehensively

IMPORTANT: Generate detailed, comprehensive study material that a student can use to learn the topic completely, even without watching the video. The content should be thorough enough to serve as standalone study notes.`;
}

/**
 * Build user prompt for context generation
 */
function buildUserPrompt(): string {
  return `Based on the video metadata provided above, generate comprehensive study notes for this educational topic.

Requirements:
1. Generate 5000-7000 words of detailed content
2. Cover all aspects mentioned in the system prompt
3. Ensure the content is exam-focused and practical
4. Use proper markdown formatting for readability
5. Include all relevant concepts for the identified topic
6. Make it comprehensive enough for self-study

Begin generating the study notes now:`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { video_id, metadata, language }: MetadataContextRequest = await req.json();

    if (!video_id || !metadata || !metadata.title) {
      return new Response(JSON.stringify({ error: "video_id and metadata.title are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🎯 Generating context from YouTube metadata");
    console.log("📹 Video ID:", video_id);
    console.log("📝 Title:", metadata.title);
    console.log("🌍 Language:", language || "en");

    // Build prompts
    const systemPrompt = buildContextGenerationPrompt(metadata, language || "en");
    const userPrompt = buildUserPrompt();

    let context: string;
    let method: string;
    let tokensUsed: { prompt: number; completion: number; total: number };

    // Use Sonar Pro / GPT-4 directly (better for long-form content generation)
    // Note: Parallel AI's lite model has limitations on output length
    console.log("🔵 Using Sonar Pro / GPT-4 for long-form content generation...");

    const response = await callAI({
      systemPrompt: systemPrompt,
      userPrompt: userPrompt,
      enableWebSearch: true, // Sonar Pro supports web search
      maxTokens: 7000,
      temperature: 0.5, // Slightly higher for creative content generation
    });

    context = response.content;
    method = response.modelUsed;
    tokensUsed = {
      prompt: response.tokensUsed.input,
      completion: response.tokensUsed.output,
      total: response.tokensUsed.input + response.tokensUsed.output,
    };

    console.log(`✅ ${response.modelUsed} succeeded`);
    logAIUsage("generate-context-from-youtube-metadata", response.tokensUsed, true, response.modelUsed);

    // Validate generated context
    if (!context || context.trim().length < 500) {
      throw new Error(
        `Generated context is too short (${context?.length || 0} chars). ` +
          `Minimum 500 characters required for meaningful study content. ` +
          `This may indicate an issue with the AI provider or video metadata quality.`,
      );
    }

    const wordCount = context.split(/\s+/).filter((w) => w.length > 0).length;

    // Warn if content is shorter than ideal
    if (context.length < 2000) {
      console.warn(`⚠️ Generated context is shorter than ideal (${context.length} chars, ${wordCount} words)`);
      console.warn("   Consider: Better video metadata, different AI model, or manual review");
    }

    console.log("✅ Context generation completed successfully");
    console.log(`📊 Method: ${method}`);
    console.log(`📏 Length: ${context.length} characters`);
    console.log(`📚 Word count: ${wordCount} words`);
    console.log(`🎯 Tokens used: ${tokensUsed.total}`);

    const response: ContextResponse = {
      success: true,
      context: context,
      method: method,
      context_length: context.length,
      word_count: wordCount,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Failed to generate context from metadata:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error occurred",
        details: error.stack || "",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
