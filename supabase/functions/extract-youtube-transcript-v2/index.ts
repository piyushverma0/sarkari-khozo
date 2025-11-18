// Extract YouTube Transcript V2 - Enhanced with YouTube Data API V3 + Claude Sonnet 4.5
// Triple fallback: YouTube API → Timedtext API → Claude with Web Capability

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY"); // Optional, falls back if not set
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoMetadata {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  duration: string;
  viewCount: number;
  publishedAt: string;
  tags: string[];
  categoryId: string;
  chapters?: Array<{ time: string; title: string }>;
}

// Extract video ID from YouTube URL
// Handles all YouTube URL formats including URLs with extra parameters like &si=, &t=, etc.

function extractVideoId(url: string): string | null {
  // Remove whitespace

  url = url.trim();

  // Pattern 1: youtube.com/watch?v=VIDEO_ID (with or without other params like &si=, &t=, etc.)

  // Matches exactly 11 characters after v=

  let match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})(?:[&/#]|$)/);

  if (match && match[1]) {
    return match[1];
  }

  // Pattern 2: youtu.be/VIDEO_ID (short URL format)

  match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/);

  if (match && match[1]) {
    return match[1];
  }

  // Pattern 3: youtube.com/embed/VIDEO_ID

  match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/);

  if (match && match[1]) {
    return match[1];
  }

  // Pattern 4: youtube.com/v/VIDEO_ID

  match = url.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/);

  if (match && match[1]) {
    return match[1];
  }

  // Pattern 5: youtube.com/shorts/VIDEO_ID

  match = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/);

  if (match && match[1]) {
    return match[1];
  }

  // Pattern 6: Fallback - try to extract any 11-character video ID

  // This catches edge cases where the URL format might be slightly different

  match = url.match(/[?&/]([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

// Fetch video metadata using YouTube Data API V3
async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
  if (!YOUTUBE_API_KEY) {
    console.log("YouTube API key not set, skipping metadata fetch");
    return null;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      throw new Error("Video not found");
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const statistics = video.statistics;

    // Extract chapters from description
    const chapters = extractChaptersFromDescription(snippet.description);

    return {
      videoId,
      title: snippet.title,
      description: snippet.description,
      channelTitle: snippet.channelTitle,
      duration: video.contentDetails.duration,
      viewCount: parseInt(statistics.viewCount || "0"),
      publishedAt: snippet.publishedAt,
      tags: snippet.tags || [],
      categoryId: snippet.categoryId,
      chapters,
    };
  } catch (error) {
    console.error("Failed to fetch YouTube metadata:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

// Extract chapters from video description (timestamps like 0:00, 1:23, etc.)
function extractChaptersFromDescription(description: string): Array<{ time: string; title: string }> {
  const chapters: Array<{ time: string; title: string }> = [];
  const lines = description.split("\n");

  // Match patterns like "0:00 Introduction" or "1:23:45 Chapter Name"
  const timestampRegex = /^(\d{1,2}:?\d{2}:?\d{2})\s+(.+)$/;

  for (const line of lines) {
    const match = line.trim().match(timestampRegex);
    if (match) {
      chapters.push({
        time: match[1],
        title: match[2].trim(),
      });
    }
  }

  return chapters;
}

// Fallback: Fetch transcript using YouTube's timedtext API
async function fetchTranscriptFromTimedtext(videoId: string, languageCode: string = "en"): Promise<string> {
  console.log(`🔍 [TIMEDTEXT] Starting transcript extraction for video: ${videoId}`);
  console.log(`🔍 [TIMEDTEXT] User preferred language: ${languageCode}`);

  // Prioritize Hindi if user language is Hindi, otherwise prioritize English
  const langCodes =
    languageCode === "hi" || languageCode === "hindi"
      ? ["hi", "hi-IN", "en", "en-US", "auto"]
      : ["en", "en-US", languageCode, "hi", "hi-IN", "auto"];

  console.log(`🔍 [TIMEDTEXT] Will try language codes in order:`, langCodes);

  for (const lang of langCodes) {
    try {
      console.log(`🔍 [TIMEDTEXT] Attempting to fetch transcript in language: ${lang}`);
      const transcriptUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      const response = await fetch(transcriptUrl);

      console.log(`🔍 [TIMEDTEXT] Response status for ${lang}:`, response.status);

      if (response.ok) {
        // Get response text first to check if it's empty
        const responseText = await response.text();
        console.log(`🔍 [TIMEDTEXT] Response length for ${lang}:`, responseText.length);

        if (!responseText || responseText.trim().length === 0) {
          console.log(`⚠️ [TIMEDTEXT] Empty response for language: ${lang}`);
          continue;
        }

        // Try to parse the JSON
        const data = JSON.parse(responseText);

        if (data.events && Array.isArray(data.events)) {
          const transcript = data.events
            .filter((event: any) => event.segs)
            .map((event: any) => event.segs.map((seg: any) => seg.utf8).join(""))
            .join(" ");

          if (transcript.trim()) {
            console.log(`✅ [TIMEDTEXT] Success! Transcript found in language: ${lang}`);
            console.log(`✅ [TIMEDTEXT] Transcript length: ${transcript.length} characters`);
            console.log(`✅ [TIMEDTEXT] Preview (first 200 chars):`, transcript.substring(0, 200));
            return transcript;
          } else {
            console.log(`⚠️ [TIMEDTEXT] Empty transcript received for language: ${lang}`);
          }
        } else {
          console.log(`⚠️ [TIMEDTEXT] No events array in response for language: ${lang}`);
        }
      } else {
        console.log(`⚠️ [TIMEDTEXT] Non-OK response status ${response.status} for language: ${lang}`);
      }
    } catch (err) {
      console.log(`❌ [TIMEDTEXT] Failed to fetch for lang ${lang}:`, err instanceof Error ? err.message : String(err));
      continue;
    }
  }

  console.error(`❌ [TIMEDTEXT] All language attempts failed. No transcript available.`);
  throw new Error("No transcript available via timedtext");
}

// Step 3: Validate transcript content
function isValidTranscript(text: string): { valid: boolean; reason?: string } {
  console.log(`🔍 [VALIDATION] Validating transcript, length: ${text.length}`);

  // Check 1: Minimum length
  if (text.length < 100) {
    console.log(`❌ [VALIDATION] Failed - too short (${text.length} < 100)`);
    return { valid: false, reason: "Transcript too short (less than 100 characters)" };
  }

  // Check 2: Not an error message
  const errorKeywords = [
    "could not",
    "cannot",
    "error",
    "failed to",
    "unable to",
    "not available",
    "access denied",
    "no transcript",
  ];

  const lowerText = text.toLowerCase();
  for (const keyword of errorKeywords) {
    if (lowerText.includes(keyword)) {
      console.log(`❌ [VALIDATION] Failed - contains error keyword: "${keyword}"`);
      return { valid: false, reason: `Transcript contains error message: "${keyword}"` };
    }
  }

  // Check 3: Not HTML/XML
  if (text.trim().startsWith("<")) {
    console.log(`❌ [VALIDATION] Failed - appears to be HTML/XML`);
    return { valid: false, reason: "Transcript appears to be HTML/XML" };
  }

  // Check 4: Not just JSON error response
  if (text.trim().startsWith("{") && (lowerText.includes("error") || lowerText.includes("message"))) {
    console.log(`❌ [VALIDATION] Failed - appears to be JSON error response`);
    return { valid: false, reason: "Transcript appears to be a JSON error response" };
  }

  console.log(`✅ [VALIDATION] Transcript is valid`);
  console.log(`✅ [VALIDATION] Preview (first 200 chars):`, text.substring(0, 200));
  return { valid: true };
}

// Ultimate fallback: Use Claude with Web Capability
async function fetchTranscriptWithClaudeWeb(videoUrl: string, metadata: VideoMetadata | null): Promise<string> {
  console.log("🌐 [CLAUDE_WEB] Using Claude Sonnet 4.5 with web capability to extract transcript...");
  console.log("🌐 [CLAUDE_WEB] Video URL:", videoUrl);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-01-21", // Enable web search capability
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4000,
        web_search: {
          enabled: true, // Enable web search
        },
        messages: [
          {
            role: "user",
            content: `Extract the full video transcript/captions from this YouTube video: ${videoUrl}

Video Title: ${metadata?.title || "Unknown"}
${metadata?.description ? `Description: ${metadata.description.substring(0, 300)}...` : ""}

Please find and extract the complete transcript/captions for this video. Return ONLY the transcript text without any additional commentary, explanations, or apologies.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const result = await response.json();
    const transcriptText = result.content && result.content[0] && result.content[0].text ? result.content[0].text : "";

    console.log(`🌐 [CLAUDE_WEB] Received response, length: ${transcriptText.length}`);
    console.log(`🌐 [CLAUDE_WEB] Preview (first 200 chars):`, transcriptText.substring(0, 200));

    if (!transcriptText || transcriptText.length < 100) {
      console.log(`❌ [CLAUDE_WEB] Insufficient content received`);
      throw new Error("Claude web extraction returned insufficient content");
    }

    console.log("✅ [CLAUDE_WEB] Transcript extracted using Claude web capability");
    return transcriptText;
  } catch (error) {
    console.error(
      "❌ [CLAUDE_WEB] Claude web extraction failed:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

// Process transcript with Claude for enhanced notes
async function processTranscriptWithClaude(
  transcript: string,
  metadata: VideoMetadata | null,
  language: string,
): Promise<{
  summary: string;
  keyPoints: string[];
  topics: string[];
  structuredContent: any; // JSON object with sections array
}> {
  console.log("📝 Processing transcript with Claude Sonnet 4.5...");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 8000,
        messages: [
          {
            role: "user",
            content: `You are an expert study notes generator for Indian students preparing for school, college, government exams and competitive tests. Process this YouTube video transcript and create comprehensive study notes.

${
  metadata
    ? `Video Title: ${metadata.title}
Channel: ${metadata.channelTitle}
${metadata.chapters && metadata.chapters.length > 0 ? `\nChapters:\n${metadata.chapters.map((c) => `- ${c.time}: ${c.title}`).join("\n")}` : ""}`
    : ""
}

Transcript:
${transcript.substring(0, 50000)} ${transcript.length > 50000 ? "...(truncated)" : ""}

Return VALID JSON with this EXACT structure:
{
  "summary": "3-5 paragraph detailed summary",
  "keyPoints": ["point 1", "point 2", ...],
  "topics": ["topic1", "topic2", ...],
  "structuredContent": {
    "sections": [
      {
        "title": "Main Section Title",
        "content": "Markdown content for this section. Use **bold** for important terms, bullet points for lists, and keep paragraphs under 4 lines."
      },
      {
        "title": "Another Section",
        "content": "More markdown content here..."
      }
    ]
  }
}

IMPORTANT RULES:
1. Return ONLY valid JSON, no extra text
2. structuredContent MUST have "sections" array
3. Each section MUST have "title" and "content"
4. Use markdown in content: **bold**, *italic*, bullet points (-)
5. Keep paragraphs under 4 lines
6. Include 8-12 key points
7. Language: ${language === "en" ? "English" : language}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const result = await response.json();
    const responseText = result.content && result.content[0] && result.content[0].text ? result.content[0].text : "{}";

    try {
      // Parse JSON response
      const parsed = JSON.parse(responseText);

      // Validate structuredContent has the right format
      if (
        !parsed.structuredContent ||
        !parsed.structuredContent.sections ||
        !Array.isArray(parsed.structuredContent.sections)
      ) {
        console.log("⚠️ structuredContent missing or invalid, creating fallback structure");
        parsed.structuredContent = {
          sections: [
            {
              title: "Content",
              content: parsed.structuredContent || responseText,
            },
          ],
        };
      }

      return {
        summary: parsed.summary || responseText,
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        structuredContent: parsed.structuredContent,
      };
    } catch (parseError) {
      // If JSON parsing fails, create minimal structure
      console.log("❌ Claude response was not valid JSON, creating fallback structure");
      return {
        summary: responseText.substring(0, 2000),
        keyPoints: [],
        topics: [],
        structuredContent: {
          sections: [
            {
              title: "Content",
              content: responseText,
            },
          ],
        },
      };
    }
  } catch (error) {
    console.error("Claude processing failed:", error instanceof Error ? error.message : String(error));
    // Return basic structure even if processing fails
    return {
      summary: transcript.substring(0, 1000) + "...",
      keyPoints: [],
      topics: [],
      structuredContent: {
        sections: [
          {
            title: "Raw Content",
            content: transcript,
          },
        ],
      },
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let note_id: string | undefined;

  try {
    const { note_id: noteIdFromBody, source_url, language } = await req.json();
    note_id = noteIdFromBody;

    if (!note_id || !source_url) {
      return new Response(JSON.stringify({ error: "note_id and source_url are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🎬 Extracting YouTube content for note:", note_id);
    console.log("URL:", source_url);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update progress: Starting extraction
    await supabase
      .from("study_notes")
      .update({
        processing_status: "extracting",
        processing_progress: 15,
      })
      .eq("id", note_id);

    // Step 1: Extract video ID
    let youtubeUrl = source_url;

    // Check if this is a storage URL containing the actual YouTube URL
    if (source_url.includes("/storage/v1/object/")) {
      console.log("📦 Detected storage URL, fetching YouTube URL from storage...");
      try {
        // Parse the storage URL to extract bucket and path
        // URL format: https://.../storage/v1/object/public/{bucket}/{path}
        const urlParts = source_url.split("/storage/v1/object/");
        if (urlParts.length < 2) {
          throw new Error("Invalid storage URL format");
        }

        const afterStorage = urlParts[1];
        // Remove 'public/' or 'authenticated/' prefix if present
        const pathWithoutPrefix = afterStorage.replace(/^(public|authenticated)\//, "");

        // Extract bucket and file path
        const pathParts = pathWithoutPrefix.split("/");
        const bucket = pathParts[0];
        const filePath = pathParts.slice(1).join("/");

        console.log(`📥 Downloading from bucket: ${bucket}, path: ${filePath}`);

        // Use Supabase Storage API to download the file
        const { data, error } = await supabase.storage.from(bucket).download(filePath);

        if (error) {
          throw new Error(`Storage download error: ${error.message}`);
        }

        if (!data) {
          throw new Error("No data received from storage");
        }

        // Convert Blob to text
        youtubeUrl = await data.text();
        youtubeUrl = youtubeUrl.trim();
        console.log("✅ Extracted YouTube URL from storage:", youtubeUrl);
      } catch (error) {
        console.error("❌ Error fetching from storage:", error);
        throw new Error(`Failed to retrieve YouTube URL from storage: ${error.message}`);
      }
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error(`Invalid YouTube URL - could not extract video ID from: ${youtubeUrl}`);
    }

    console.log("📹 Video ID:", videoId);

    // Step 2: Fetch video metadata from YouTube Data API V3
    let metadata: VideoMetadata | null = null;
    let videoTitle = "YouTube Video";

    try {
      metadata = await fetchVideoMetadata(videoId);
      if (metadata) {
        videoTitle = metadata.title;
        console.log("✅ Metadata fetched from YouTube API:", videoTitle);

        // Update with video title and metadata
        await supabase
          .from("study_notes")
          .update({
            title: videoTitle,
            processing_progress: 25,
          })
          .eq("id", note_id);
      } else {
        // Fallback: Try to get title from oEmbed
        try {
          const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
          const metadataResponse = await fetch(oembedUrl);
          if (metadataResponse.ok) {
            const oembedData = await metadataResponse.json();
            videoTitle = oembedData.title || videoTitle;
            console.log("✅ Title fetched from oEmbed:", videoTitle);

            await supabase
              .from("study_notes")
              .update({
                title: videoTitle,
                processing_progress: 25,
              })
              .eq("id", note_id);
          }
        } catch (err) {
          console.log("oEmbed fetch failed:", err instanceof Error ? err.message : String(err));
        }
      }
    } catch (error) {
      console.log(
        "Metadata fetch failed, will continue with transcript extraction:",
        error instanceof Error ? error.message : String(error),
      );
    }

    // Update progress: Fetching transcript
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 30,
      })
      .eq("id", note_id);

    // Step 3: Fetch transcript (triple fallback strategy)
    console.log(`📥 [EXTRACTION] Starting transcript extraction for video: ${videoId}`);
    let transcript: string;
    let extractionMethod: string;

    try {
      // Method 1: Try timedtext API (most reliable free method)
      console.log(`📥 [EXTRACTION] Attempting Method 1: Timedtext API`);
      transcript = await fetchTranscriptFromTimedtext(videoId, language);
      extractionMethod = "timedtext";
      console.log(`✅ [EXTRACTION] Method 1 succeeded: Timedtext API`);
    } catch (timedtextError) {
      console.log(
        "⚠️ [EXTRACTION] Method 1 failed - Timedtext extraction:",
        timedtextError instanceof Error ? timedtextError.message : String(timedtextError),
      );

      try {
        // Method 2: Ultimate fallback - Claude with web capability
        console.log(`📥 [EXTRACTION] Attempting Method 2: Claude Web Capability`);
        transcript = await fetchTranscriptWithClaudeWeb(youtubeUrl, metadata);
        extractionMethod = "claude_web";
        console.log(`✅ [EXTRACTION] Method 2 succeeded: Claude Web Capability`);
      } catch (claudeError) {
        console.error("❌ [EXTRACTION] All extraction methods failed");

        // Step 4: Better error handling - fail with clear message
        const errorMessage = `Could not extract captions from this video. The video may not have captions available in Hindi or English. Please try a different video or enable captions on YouTube.`;

        await supabase
          .from("study_notes")
          .update({
            processing_status: "failed",
            processing_error: errorMessage,
            processing_progress: 0,
          })
          .eq("id", note_id);

        throw new Error(errorMessage);
      }
    }

    // Step 3: Validate transcript before processing
    const validation = isValidTranscript(transcript);
    if (!validation.valid) {
      console.error(`❌ [EXTRACTION] Transcript validation failed: ${validation.reason}`);

      const errorMessage = `Extracted content is invalid: ${validation.reason}. Please try a different video.`;

      await supabase
        .from("study_notes")
        .update({
          processing_status: "failed",
          processing_error: errorMessage,
          processing_progress: 0,
        })
        .eq("id", note_id);

      throw new Error(errorMessage);
    }

    console.log(`✅ [EXTRACTION] Transcript successfully extracted and validated via ${extractionMethod}`);
    console.log(`✅ [EXTRACTION] Transcript length: ${transcript.length} characters`);

    // Calculate word count and reading time
    const wordCount = transcript.split(/\s+/).filter((w) => w.length > 0).length;
    const estimatedReadTime = Math.ceil(wordCount / 200); // 200 words per minute

    console.log(`📊 Stats: ${wordCount} words, ~${estimatedReadTime} min read time`);

    // Update progress: Processing transcript
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 50,
      })
      .eq("id", note_id);

    // Step 4: Process transcript with Claude for enhanced notes
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 60,
        processing_status: "processing",
      })
      .eq("id", note_id);

    const processed = await processTranscriptWithClaude(transcript, metadata, language);

    console.log("✅ Claude processing complete");

    // Update progress: Finalizing
    // Save structured content as JSON object with sections array
    const { error: updateError } = await supabase
      .from("study_notes")
      .update({
        processing_progress: 85,
        summary: processed.summary,
        structured_content: processed.structuredContent, // JSON object with sections
        tags: processed.topics,
      })
      .eq("id", note_id);

    if (updateError) {
      console.error("❌ Failed to save processed data:", updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    // Mark as complete
    const { error: completeError } = await supabase
      .from("study_notes")
      .update({
        processing_status: "completed",
        processing_progress: 100,
      })
      .eq("id", note_id);

    if (completeError) {
      console.error("❌ Failed to mark note as completed:", completeError);
      throw new Error(`Failed to mark as completed: ${completeError.message}`);
    }

    console.log("✅ Processing complete for note:", note_id);

    return new Response(
      JSON.stringify({
        success: true,
        note_id,
        extraction_method: extractionMethod,
        metadata: metadata
          ? {
              title: metadata.title,
              channel: metadata.channelTitle,
              duration: metadata.duration,
              views: metadata.viewCount,
              chapters: metadata.chapters?.length || 0,
            }
          : { title: videoTitle },
        transcript_length: transcript.length,
        word_count: wordCount,
        estimated_read_time: estimatedReadTime,
        key_points_count: processed.keyPoints.length,
        topics_count: processed.topics.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Error in extract-youtube-transcript-v2:", error);

    // Update note status to failed
    if (note_id) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { error: updateError } = await supabase
          .from("study_notes")
          .update({
            processing_status: "failed",
            processing_error: error instanceof Error ? error.message : "YouTube transcript extraction failed",
            processing_progress: 0,
          })
          .eq("id", note_id);

        if (updateError) {
          console.error("Failed to update error status:", updateError);
        }
      } catch (e) {
        console.error("Failed to update error status:", e);
      }
    }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
