// Extract YouTube Transcript - Get transcript from YouTube videos
// Supports multiple languages using youtube-transcript npm package

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { YoutubeTranscript } from "npm:youtube-transcript@1.2.1";

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
  } catch (error) {
    console.error(`❌ Storage fetch error:`, error);
    throw new Error(`Failed to fetch YouTube URL from storage: ${error.message}`);
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
      } catch (err) {
        console.log(`Failed to fetch transcript for lang ${lang}:`, err.message);
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
    } catch (err) {
      console.log("Failed to fetch default transcript:", err.message);
    }

    throw new Error("No transcript available for this video. The video may not have captions enabled.");
  } catch (error) {
    throw new Error(`Failed to fetch YouTube transcript: ${error.message}`);
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
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const metadataResponse = await fetch(oembedUrl);
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json();
        videoTitle = metadata.title || videoTitle;
        console.log("📊 Video title:", videoTitle);
      }
    } catch (err) {
      console.log("⚠️ Failed to fetch video metadata:", err.message);
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
    console.log("📝 Fetching transcript...");
    const transcript = await fetchYouTubeTranscript(videoId, language || "en");

    if (!transcript || transcript.trim().length === 0) {
      throw new Error("Transcript is empty or unavailable");
    }

    console.log("✅ Transcript extracted, length:", transcript.length, "characters");

    // Calculate word count
    const wordCount = transcript.split(/\s+/).filter((w) => w.length > 0).length;
    const estimatedReadTime = Math.ceil(wordCount / 200); // 200 words per minute

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 50,
      })
      .eq("id", note_id);

    // Step 4: Store transcript in database
    const { error: updateError } = await supabase
      .from("study_notes")
      .update({
        raw_content: transcript,
        word_count: wordCount,
        estimated_read_time: estimatedReadTime,
        processing_progress: 55,
        metadata: {
          video_id: videoId,
          original_url: actualYouTubeUrl,
          transcript_method: "youtube-transcript-npm",
        },
      })
      .eq("id", note_id);

    if (updateError) {
      console.error("❌ Failed to update note with transcript:", updateError);
      throw updateError;
    }

    console.log("💾 Transcript stored in database");

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
          raw_content: transcript,
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
        transcript_length: transcript.length,
        word_count: wordCount,
        method_used: "youtube-transcript-npm",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
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
            processing_error: error.message || "YouTube transcript extraction failed",
          })
          .eq("id", body.note_id);
      }
    } catch (e) {
      console.error("Failed to update error status:", e);
    }

    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error",
        details: error.stack || "",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
