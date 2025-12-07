// Generate Audio Script - Create conversational dialogue between Raj and Priya
// Uses Gemini 2.0 Flash to generate friendly, educational conversation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { callGemini, logGeminiUsage } from "../_shared/gemini-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateScriptRequest {
  note_id: string;
  language: "hi" | "en";
}

interface ConversationTurn {
  speaker: "Raj" | "Priya";
  text: string;
  emotion?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { note_id, language }: GenerateScriptRequest = await req.json();

    if (!note_id || !language) {
      return new Response(JSON.stringify({ error: "note_id and language are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating ${language} audio script for note: ${note_id}`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch note content
    const { data: note, error: fetchError } = await supabase
      .from("study_notes")
      .select("title, summary, key_points, structured_content")
      .eq("id", note_id)
      .single();

    if (fetchError || !note) {
      throw new Error("Failed to fetch note: " + (fetchError?.message || "Note not found"));
    }

    // Update status to generating
    const scriptField = language === "hi" ? "audio_script_hindi" : "audio_script_english";
    await supabase.from("study_notes").update({ audio_generation_status: "generating_script" }).eq("id", note_id);

    // Prepare content for Claude
    const keyPoints = Array.isArray(note.key_points) ? note.key_points.join("\n- ") : "";
    const sectionsText = note.structured_content?.sections
      ? note.structured_content.sections.map((s: any) => `${s.title}: ${s.content}`).join("\n\n")
      : "";

    // Build conversation prompt based on language
    const userPrompt = buildConversationPrompt(note.title, note.summary || "", keyPoints, sectionsText, language);

    const systemPrompt =
      "You are an expert at creating engaging, educational conversations between two Indian students. Create natural, friendly dialogues that help students learn. Always return valid JSON.";

    console.log("Calling Gemini API to generate script...");

    // Call Gemini API
    const geminiResponse = await callGemini({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 4096,
      responseFormat: "json",
    });

    logGeminiUsage("generate-audio-script", geminiResponse.tokensUsed, geminiResponse.webSearchUsed);

    console.log("Gemini response received");

    // Extract response text
    let responseText = geminiResponse.content;

    if (!responseText.trim()) {
      throw new Error("Empty response from Gemini");
    }

    // Clean up JSON (remove markdown code blocks if present)
    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // Parse JSON
    let script;
    try {
      script = JSON.parse(cleanedJson);
    } catch (parseError: unknown) {
      console.error("Failed to parse JSON:", parseError);
      console.error("Response text:", responseText.substring(0, 500));
      const errMessage = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(`Failed to parse script: ${errMessage}`);
    }

    console.log(`Script generated with ${script.turns?.length || 0} turns`);

    // Calculate estimated duration (assuming ~2 seconds per turn on average)
    const estimatedDuration = (script.turns?.length || 0) * 2;

    const scriptData = {
      turns: script.turns || [],
      estimatedDuration: estimatedDuration,
    };

    // Store script in database
    await supabase
      .from("study_notes")
      .update({
        [scriptField]: scriptData,
        audio_generation_status: "not_generated", // Reset status, ready for audio generation
      })
      .eq("id", note_id);

    console.log("Script stored in database");

    return new Response(
      JSON.stringify({
        success: true,
        script: scriptData,
        turns_count: script.turns?.length || 0,
        estimated_duration: estimatedDuration,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error in generate-audio-script:", error);
    const errMessage = error instanceof Error ? error.message : String(error);

    // Update status to failed
    try {
      const body = await req.json();
      if (body.note_id) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from("study_notes")
          .update({
            audio_generation_status: "failed",
            audio_generation_error: errMessage,
          })
          .eq("id", body.note_id);
      }
    } catch (e) {
      console.error("Failed to update error status:", e);
    }

    return new Response(JSON.stringify({ error: errMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildConversationPrompt(
  title: string,
  summary: string,
  keyPoints: string,
  sectionsText: string,
  language: "hi" | "en",
): string {
  const isHindi = language === "hi";

  const languageInstruction = isHindi
    ? `Language: Hinglish (mix of Hindi and English). Use Hindi for conversation but keep technical terms in English. Make it natural like how Indian students actually talk.

Examples:
- "Yaar, ye UPSC exam bohot tough hai, samjha?"
- "Haan Raj, dekh main tujhe simple mein samjhati hoon..."
- "Achha, toh basically teen stages hote hain - Prelims, Mains aur Interview."
- "Perfect! Ab ye eligibility criteria bhi important hai..."

Use common Hindi words: yaar, dekh, achha, samjha, basically, matlab, etc.`
    : `Language: Simple, friendly English with Indian context. Avoid complex jargon. Use examples relevant to Indian students.

Examples:
- "Hey Priya, I've been reading about this topic but it's quite complex..."
- "Don't worry Raj, let me break it down for you in simple terms..."
- "So basically, there are three main stages - Prelims, Mains, and Interview."
- "Got it! And what about the eligibility criteria?"`;

  return `You are creating a friendly, educational conversation between two Indian students discussing study material.

Participants:
- **Raj** (Male, enthusiastic learner): Asks questions, represents the student's perspective, curious and eager to learn
- **Priya** (Female, knowledgeable teacher): Explains concepts clearly, patient and friendly

${languageInstruction}

Content to discuss:
**Topic:** ${title}

**Summary:** ${summary}

**Key Points:**
${keyPoints}

**Detailed Content:**
${sectionsText.substring(0, 3000)}

CRITICAL GUIDELINES:
1. **Natural Conversation**: Make it feel like two friends discussing over chai
2. **Question-Answer Format**: Raj asks questions, Priya explains
3. **Short Turns**: Each turn should be 2-3 sentences maximum (30-50 words)
4. **Simple Language**: No complex jargon, explain technical terms simply
5. **Indian Context**: Use examples from Indian daily life, exams, jobs
6. **Engaging**: Include occasional exclamations, affirmations ("Exactly!", "Wah!", "Perfect!")
7. **Total Duration**: Create 12-18 turns for a 3-5 minute conversation
8. **Structure**:
   - Opening (2 turns): Introduce the topic
   - Main Discussion (8-12 turns): Cover 3-5 key points with back-and-forth
   - Quick Recap (2 turns): Summarize important points
   - Closing (1-2 turns): Encouragement and next steps

EMOTION TAGS:
Use these emotions for better voice modulation:
- curious, explaining, excited, thoughtful, encouraging, surprised, confident

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown, no code blocks):
{
  "turns": [
    {
      "speaker": "Raj",
      "text": "Hey Priya, can you help me understand this topic?",
      "emotion": "curious"
    },
    {
      "speaker": "Priya",
      "text": "Of course Raj! Let me explain it step by step.",
      "emotion": "encouraging"
    }
  ]
}

Remember:
- Keep each turn SHORT (2-3 sentences)
- Make it CONVERSATIONAL and NATURAL
- Cover MAIN POINTS from the content
- End with ENCOURAGEMENT

Generate the conversation now:`;
}
