// Extract YouTube Transcript - Get transcript from YouTube videos
// Supports multiple languages using youtube-transcript npm package

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { YoutubeTranscript } from "https://esm.sh/youtube-transcript@1.2.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractRequest {
  note_id: string;
  source_url: string;
  language: string;
}

// ============================================================
// Check if URL is a Supabase Storage URL
// ============================================================
function isSupabaseStorageUrl(url: string): boolean {
  const storagePatterns = [/supabase\.co\/storage\/v1\/object\/public/, /supabase\.co\/storage\/v1\/object\/sign/];
  return storagePatterns.some((pattern) => pattern.test(url));
}

// ============================================================
// Fetch YouTube URL from Supabase Storage
// ============================================================
async function fetchYouTubeUrlFromStorage(storageUrl: string): Promise<string> {
  console.log(`📂 Fetching content from storage: ${storageUrl}`);

  try {
    const response = await fetch(storageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch from storage: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    const trimmedContent = content.trim();

    console.log(`✅ Retrieved content (${trimmedContent.length} chars): ${trimmedContent.substring(0, 100)}...`);

    // Validate it looks like a YouTube URL
    if (!trimmedContent.includes("youtube.com") && !trimmedContent.includes("youtu.be")) {
      throw new Error(`Content doesn't appear to be a YouTube URL: ${trimmedContent}`);
    }

    return trimmedContent;
  } catch (error: unknown) {
    console.error(`❌ Storage fetch error:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch YouTube URL from storage: ${errorMessage}`);
  }
}

// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Fetch transcript using youtube-transcript npm package
async function fetchYouTubeTranscript(videoId: string, languageCode: string = "en"): Promise<string> {
  try {
    // Try to fetch with specified language first, then fallback to auto-generated
    const langCodes = [languageCode, "en", "hi"];

    for (const lang of langCodes) {
      try {
        console.log(`Attempting to fetch transcript in language: ${lang}`);

        // Fetch transcript using the npm package
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: lang,
        });

        if (transcriptItems && transcriptItems.length > 0) {
          // Join all transcript segments into a single string
          const transcript = transcriptItems.map((item: any) => item.text).join(" ");

          if (transcript.trim()) {
            console.log(`✓ Transcript found in language: ${lang} (${transcriptItems.length} segments)`);
            return transcript;
          }
        }
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : String(err);
        console.log(`Failed to fetch transcript for lang ${lang}:`, errMessage);
        // Continue to next language
        continue;
      }
    }

    // If language-specific fetch failed, try without language parameter (gets default/auto-generated)
    try {
      console.log("Attempting to fetch default/auto-generated transcript");
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

      if (transcriptItems && transcriptItems.length > 0) {
        const transcript = transcriptItems.map((item: any) => item.text).join(" ");

        if (transcript.trim()) {
          console.log(`✓ Default transcript found (${transcriptItems.length} segments)`);
          return transcript;
        }
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      console.log("Failed to fetch default transcript:", errMessage);
    }

    throw new Error("No transcript available for this video. The video may not have captions enabled.");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch YouTube transcript: ${errorMessage}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { note_id, source_url, language }: ExtractRequest = await req.json();

    if (!note_id || !source_url) {
      return new Response(JSON.stringify({ error: "note_id and source_url are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🎬 Extracting YouTube transcript for note:", note_id);
    console.log("🔗 Source URL:", source_url);
    console.log("🌍 Language:", language || "en");

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_status: "extracting",
        processing_progress: 20,
      })
      .eq("id", note_id);

    // Check if source_url is a Supabase Storage URL and fetch actual YouTube URL if needed
    let actualYouTubeUrl = source_url;

    if (isSupabaseStorageUrl(source_url)) {
      console.log("📂 Detected Supabase Storage URL, fetching content...");
      actualYouTubeUrl = await fetchYouTubeUrlFromStorage(source_url);
      console.log(`✅ Extracted YouTube URL from file: "${actualYouTubeUrl}"`);
    }

    // Step 1: Extract video ID
    const videoId = extractVideoId(actualYouTubeUrl);
    if (!videoId) {
      throw new Error(`Invalid YouTube URL - could not extract video ID from: ${actualYouTubeUrl}`);
    }

    console.log("📹 Video ID:", videoId);

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 30,
      })
      .eq("id", note_id);

    // Step 2: Fetch video metadata using oEmbed API
    let videoTitle = "YouTube Video";
    let videoMetadata: any = {};
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const metadataResponse = await fetch(oembedUrl);
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json();
        videoTitle = metadata.title || videoTitle;
        videoMetadata = {
          title: videoTitle,
          channel: metadata.author_name || "",
          thumbnail_url: metadata.thumbnail_url || "",
        };
        console.log("📊 Video title:", videoTitle);
        console.log("📺 Channel:", videoMetadata.channel);
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      console.log("⚠️ Failed to fetch video metadata:", errMessage);
      videoMetadata = { title: videoTitle };
    }

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 40,
        title: videoTitle,
      })
      .eq("id", note_id);

    // Step 3: Fetch transcript using youtube-transcript npm package
    // If transcript fails, fallback to metadata-based context generation
    console.log("📝 Fetching transcript...");

    let rawContent: string;
    let contentSource: string;
    let wordCount: number;
    let estimatedReadTime: number;

    try {
      // PRIMARY: Try to fetch transcript from captions
      const transcript = await fetchYouTubeTranscript(videoId, language || "en");

      if (!transcript || transcript.trim().length === 0) {
        throw new Error("Transcript is empty");
      }

      rawContent = transcript;
      contentSource = "transcript";

      console.log("✅ Transcript extracted successfully");
      console.log(`📏 Transcript length: ${transcript.length} characters`);
    } catch (transcriptError: unknown) {
      // FALLBACK: Generate context from metadata when transcript unavailable
      const transcriptErrorMessage = transcriptError instanceof Error ? transcriptError.message : String(transcriptError);
      console.warn("⚠️ Transcript extraction failed:", transcriptErrorMessage);
      console.log("🔄 Video likely has no captions - falling back to metadata-based context generation...");

      try {
        // Call new edge function to generate context from metadata
        const contextResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-context-from-youtube-metadata`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            video_id: videoId,
            metadata: videoMetadata,
            language: language || "en",
          }),
        });

        if (!contextResponse.ok) {
          const errorText = await contextResponse.text();
          throw new Error(`Context generation failed: ${contextResponse.status} - ${errorText}`);
        }

        const contextData = await contextResponse.json();

        if (!contextData.success || !contextData.context) {
          throw new Error("Context generation returned invalid data");
        }

        rawContent = contextData.context;
        contentSource = "metadata-generated";

        console.log("✅ Context generated from metadata successfully");
        console.log(`📏 Generated context length: ${contextData.context_length} characters`);
        console.log(`📚 Word count: ${contextData.word_count} words`);
        console.log(`🤖 Generation method: ${contextData.method}`);
      } catch (contextError: unknown) {
        const contextErrorMessage = contextError instanceof Error ? contextError.message : String(contextError);
        console.error("❌ Both transcript extraction and context generation failed");
        throw new Error(
          `Unable to extract content from video. ` +
            `Transcript error: ${transcriptErrorMessage}. ` +
            `Context generation error: ${contextErrorMessage}`,
        );
      }
    }

    // Calculate metrics for the content (transcript or generated)
    wordCount = rawContent.split(/\s+/).filter((w) => w.length > 0).length;
    estimatedReadTime = Math.ceil(wordCount / 200); // 200 words per minute

    console.log(
      `📊 Final content - Source: ${contentSource}, Words: ${wordCount}, Read time: ${estimatedReadTime} min`,
    );

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 50,
      })
      .eq("id", note_id);

    // Step 4: Store content in database (transcript or generated context)
    const { error: updateError } = await supabase
      .from("study_notes")
      .update({
        raw_content: rawContent,
        word_count: wordCount,
        estimated_read_time: estimatedReadTime,
        processing_progress: 55,
        metadata: {
          video_id: videoId,
          original_url: actualYouTubeUrl,
          content_source: contentSource, // 'transcript' or 'metadata-generated'
          transcript_method: contentSource === "transcript" ? "youtube-transcript-npm" : "ai-generated-from-metadata",
        },
      })
      .eq("id", note_id);

    if (updateError) {
      console.error("❌ Failed to update note with content:", updateError);
      throw updateError;
    }

    console.log(`💾 Content stored in database (source: ${contentSource})`);

    // Step 5: Trigger summarization
    try {
      fetch(`${SUPABASE_URL}/functions/v1/generate-notes-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          note_id,
          raw_content: rawContent,
          language: language || "en",
        }),
      }).catch((err) => {
        console.error("❌ Failed to trigger summarization:", err);
        // Update note status to failed
        supabase
          .from("study_notes")
          .update({
            processing_status: "failed",
            processing_error: "Failed to start summarization process",
          })
          .eq("id", note_id);
      });

      console.log("🔄 Summarization triggered for note:", note_id);
    } catch (triggerError) {
      console.error("❌ Failed to trigger summarization:", triggerError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        note_id,
        video_id: videoId,
        video_title: videoTitle,
        content_length: rawContent.length,
        word_count: wordCount,
        content_source: contentSource, // 'transcript' or 'metadata-generated'
        method_used: contentSource === "transcript" ? "youtube-transcript-npm" : "ai-generated-from-metadata",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    console.error("❌ Error in extract-youtube-transcript:", error);

    // Update note status to failed
    try {
      const bodyText = await req.text();
      const body = JSON.parse(bodyText);
      if (body.note_id) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        await supabase
          .from("study_notes")
          .update({
            processing_status: "failed",
            processing_error: errorMessage || "YouTube transcript extraction failed",
          })
          .eq("id", body.note_id);
      }
    } catch (e) {
      console.error("Failed to update error status:", e);
    }

    return new Response(
      JSON.stringify({
        error: errorMessage || "Unknown error",
        details: errorStack || "",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
