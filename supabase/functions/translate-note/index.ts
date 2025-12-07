// Translate Note - Context-aware translation using AI
// Supports 10 Indian languages with caching

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { callAI, logAIUsage } from "../_shared/ai-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TranslateRequest {
  note_id: string;
  user_id: string;
  target_language: "hi" | "mr" | "bn" | "ta" | "te" | "gu" | "kn" | "ml" | "pa" | "or";
}

const languageNames: Record<string, string> = {
  hi: "Hindi (हिन्दी)",
  mr: "Marathi (मराठी)",
  bn: "Bengali (বাংলা)",
  ta: "Tamil (தமிழ்)",
  te: "Telugu (తెలుగు)",
  gu: "Gujarati (ગુજરાતી)",
  kn: "Kannada (ಕನ್ನಡ)",
  ml: "Malayalam (മലയാളം)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
  or: "Odia (ଓଡ଼ିଆ)",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { note_id, user_id, target_language }: TranslateRequest = await req.json();

    if (!note_id || !user_id || !target_language) {
      return new Response(
        JSON.stringify({ error: "note_id, user_id, and target_language are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Translating note:", note_id, "to", languageNames[target_language]);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if translation already exists
    const { data: existingTranslation, error: fetchError } = await supabase
      .from("note_translations")
      .select("*")
      .eq("note_id", note_id)
      .eq("target_language", target_language)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error checking for existing translation:", fetchError);
    }

    if (existingTranslation) {
      console.log("Translation already exists, returning cached version");
      return new Response(
        JSON.stringify({
          success: true,
          cached: true,
          translation: existingTranslation,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch note content
    const { data: note, error: noteError } = await supabase
      .from("study_notes")
      .select("title, summary, key_points, structured_content, raw_content")
      .eq("id", note_id)
      .single();

    if (noteError || !note) {
      throw new Error("Note not found");
    }

    console.log("Note fetched:", note.title);

    // Build translation prompt
    const contentToTranslate = {
      title: note.title,
      summary: note.summary,
      key_points: note.key_points,
      structured_content: note.structured_content,
    };

    const prompt = `You are an expert translator specializing in Indian languages with deep understanding of government exam terminology.

TASK: Translate the following study notes from English to ${languageNames[target_language]}.

CRITICAL TRANSLATION RULES:
1. Maintain accuracy and context
2. Preserve technical terms appropriately:
   - Keep English terms if commonly used in education (e.g., "Application", "Form")
   - Translate when clear native equivalent exists
   - Use bilingual format when helpful: "आवेदन (Application)"
3. Keep proper nouns, organization names, and URLs unchanged
4. Preserve dates, numbers, and formatting
5. Maintain the structure and hierarchy
6. Ensure natural, fluent language
7. Keep exam-specific terminology accurate
8. Preserve all important information

CONTENT TO TRANSLATE:
${JSON.stringify(contentToTranslate, null, 2)}

OUTPUT FORMAT: Return ONLY valid JSON (no markdown):
{
  "title": "Translated title",
  "summary": "Translated summary",
  "key_points": ["Translated point 1", "Translated point 2", ...],
  "structured_content": {
    ... (translate all text fields while preserving structure)
  }
}

Translate to ${languageNames[target_language]}. Return ONLY the JSON.`;

    const systemPrompt = `You are an expert translator for Indian languages. Always return valid JSON without markdown. Maintain accuracy and context.`;

    // Call AI (Sonar Pro → GPT-4-turbo fallback)
    console.log("Calling AI for translation...");
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt: prompt,
      temperature: 0.2,
      maxTokens: 8192,
    });

    logAIUsage("translate-note", aiResponse.tokensUsed, aiResponse.webSearchUsed, aiResponse.modelUsed);

    console.log("AI translation complete");

    // Extract response text
    let responseText = aiResponse.content;

    // Clean up response
    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // Parse JSON
    let translatedContent;
    try {
      translatedContent = JSON.parse(cleanedJson);
    } catch (parseError: unknown) {
      console.error("Failed to parse JSON:", parseError);
      console.error("Response text:", responseText.substring(0, 500));
      const errorMessage = parseError instanceof Error ? parseError.message : "Unknown parse error";
      throw new Error(`Failed to parse translation: ${errorMessage}`);
    }

    console.log("Translation parsed successfully");

    // Store translation in database
    const { data: translation, error: insertError } = await supabase
      .from("note_translations")
      .insert({
        note_id,
        target_language,
        translated_title: translatedContent.title,
        translated_summary: translatedContent.summary,
        translated_key_points: translatedContent.key_points,
        translated_content: translatedContent.structured_content,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to store translation:", insertError);
      throw insertError;
    }

    console.log("Translation stored in database");

    // Update note to indicate translation exists
    await supabase
      .from("study_notes")
      .update({ has_translation: true })
      .eq("id", note_id);

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        translation,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in translate-note:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
