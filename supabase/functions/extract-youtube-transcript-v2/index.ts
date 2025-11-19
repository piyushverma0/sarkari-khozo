// Extract YouTube Transcript V2 - Enhanced with YouTube Data API V3 + Claude Sonnet 4.5
// Quad extraction strategy: youtube-transcript → Timedtext API → Claude Web Capability → Metadata

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import YoutubeTranscript from "npm:youtube-transcript@1.2.1";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
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

interface TranscriptSegment {
  time: string;
  text: string;
  startSeconds: number;
}

// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  url = url.trim();

  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})(?:[&/#]|$)/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}

// Fetch video metadata using YouTube Data API V3
async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
  if (!YOUTUBE_API_KEY) {
    console.log("⚠️ YouTube API key not set, skipping metadata fetch");
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
      chapters: extractChaptersFromDescription(snippet.description),
    };
  } catch (error) {
    console.error("❌ Failed to fetch YouTube metadata:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

// Extract chapters from video description
function extractChaptersFromDescription(description: string): Array<{ time: string; title: string }> {
  const chapters: Array<{ time: string; title: string }> = [];
  const lines = description.split("\n");
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

// Helper: Format seconds to MM:SS or HH:MM:SS
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// ✅ METHOD 1: Use youtube-transcript npm package (Primary)
async function fetchTranscriptWithYoutubeTranscript(
  videoId: string
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string }> {
  console.log(`📦 [NPM_PACKAGE] Attempting transcript extraction using youtube-transcript package`);
  console.log(`📦 [NPM_PACKAGE] Video ID: ${videoId}`);

  try {
    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcriptData || transcriptData.length === 0) {
      throw new Error("No transcript data returned from youtube-transcript package");
    }

    console.log(`📦 [NPM_PACKAGE] Retrieved ${transcriptData.length} transcript segments`);

    const segments: TranscriptSegment[] = [];
    const textParts: string[] = [];
    const timestampedParts: string[] = [];

    for (const item of transcriptData) {
      const startSeconds = Math.floor(item.offset / 1000);
      const timeStr = formatTimestamp(startSeconds);
      const text = item.text.trim();

      if (text) {
        segments.push({
          time: timeStr,
          text: text,
          startSeconds: startSeconds,
        });

        textParts.push(text);
        timestampedParts.push(`[${timeStr}] ${text}`);
      }
    }

    if (segments.length === 0) {
      throw new Error("No valid segments extracted from transcript data");
    }

    const fullText = textParts.join(" ");
    const timestampedText = timestampedParts.join("\n");

    console.log(`✅ [NPM_PACKAGE] Success! Extracted ${segments.length} segments`);
    console.log(`✅ [NPM_PACKAGE] Total text length: ${fullText.length} characters`);

    return {
      segments,
      text: fullText,
      timestampedText,
    };
  } catch (error) {
    console.error(`❌ [NPM_PACKAGE] Failed:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// ✅ METHOD 2: Fetch transcript using YouTube Timedtext API
async function fetchTranscriptFromTimedtext(
  videoId: string,
  languageCode: string = "en",
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string }> {
  console.log(`🔍 [TIMEDTEXT] Starting transcript extraction for video: ${videoId}`);
  console.log(`🔍 [TIMEDTEXT] User preferred language: ${languageCode}`);

  const langCodes =
    languageCode === "hi" || languageCode === "hindi"
      ? ["hi", "hi-IN", "en", "en-US", "auto"]
      : ["en", "en-US", languageCode, "hi", "hi-IN", "auto"];

  console.log(`🔍 [TIMEDTEXT] Will try languages: ${langCodes.join(", ")}`);

  for (const lang of langCodes) {
    try {
      console.log(`🔍 [TIMEDTEXT] Attempting language: ${lang}`);

      const transcriptUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      const response = await fetch(transcriptUrl);

      console.log(`🔍 [TIMEDTEXT] Response status: ${response.status}`);

      if (response.ok) {
        const responseText = await response.text();
        console.log(`🔍 [TIMEDTEXT] Response length: ${responseText.length}`);

        if (responseText && responseText.trim().length > 0) {
          try {
            const data = JSON.parse(responseText);

            if (data.events && Array.isArray(data.events)) {
              const segments: TranscriptSegment[] = [];
              const textParts: string[] = [];
              const timestampedParts: string[] = [];

              for (const event of data.events) {
                if (event.segs) {
                  const text = event.segs
                    .map((seg: any) => seg.utf8)
                    .join("")
                    .trim();

                  if (text && event.tStartMs !== undefined) {
                    const startSeconds = Math.floor(event.tStartMs / 1000);
                    const timeStr = formatTimestamp(startSeconds);

                    segments.push({
                      time: timeStr,
                      text: text,
                      startSeconds: startSeconds,
                    });

                    textParts.push(text);
                    timestampedParts.push(`[${timeStr}] ${text}`);
                  }
                }
              }

              if (segments.length > 0) {
                const fullText = textParts.join(" ");
                const timestampedText = timestampedParts.join("\n");

                console.log(`✅ [TIMEDTEXT] Success! Language: ${lang}`);
                console.log(`✅ [TIMEDTEXT] Segments: ${segments.length}`);
                console.log(`✅ [TIMEDTEXT] Length: ${fullText.length} characters`);

                return {
                  segments,
                  text: fullText,
                  timestampedText,
                };
              }
            }
          } catch (parseError) {
            console.log(`⚠️ [TIMEDTEXT] JSON parse error for ${lang}`);
            continue;
          }
        } else {
          console.log(`⚠️ [TIMEDTEXT] Empty response for language: ${lang}`);
        }
      }
    } catch (err) {
      console.log(`❌ [TIMEDTEXT] Failed for ${lang}:`, err instanceof Error ? err.message : String(err));
      continue;
    }
  }

  console.error(`❌ [TIMEDTEXT] All language attempts failed`);
  throw new Error("No transcript available via timedtext API");
}

// ✅ METHOD 3: Use Claude Web Capability to extract transcript (fallback)
async function fetchTranscriptWithClaudeWeb(videoUrl: string, metadata: VideoMetadata | null): Promise<string> {
  console.log("🌐 [CLAUDE_WEB] Using Claude web capability to extract transcript...");
  console.log("🌐 [CLAUDE_WEB] Video URL:", videoUrl);

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
            content: `Please visit this YouTube video and extract the transcript/captions for me: ${videoUrl}

Video Title: ${metadata?.title || "Unknown"}
Channel: ${metadata?.channelTitle || "Unknown"}

Extract the full transcript/captions from the video. If captions are not available, provide a comprehensive summary based on what you can see in the video description and any available information.

Return the transcript in a clean, readable format with timestamps if available.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude Web API error: ${error}`);
    }

    const result = await response.json();
    const content = result.content?.[0]?.text || "";

    if (content.length < 200) {
      throw new Error("Claude web extraction returned insufficient content");
    }

    console.log(`✅ [CLAUDE_WEB] Extracted ${content.length} characters via web capability`);
    return content;
  } catch (error) {
    console.error("❌ [CLAUDE_WEB] Failed:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// METHOD 4: Generate content from metadata (last resort)
async function generateContentFromMetadata(videoUrl: string, metadata: VideoMetadata | null): Promise<string> {
  console.log("🌐 [CLAUDE_METADATA] Generating content from metadata...");

  if (!metadata || !metadata.description || metadata.description.length < 200) {
    throw new Error("Insufficient metadata to generate content");
  }

  console.log("🌐 [CLAUDE_METADATA] Using video metadata and description");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `Create comprehensive study notes based on this YouTube video's metadata:

Title: ${metadata.title}
Channel: ${metadata.channelTitle}
Duration: ${metadata.duration}
Views: ${metadata.viewCount}

Description:
${metadata.description}

${metadata.chapters && metadata.chapters.length > 0 ? `\nChapters:\n${metadata.chapters.map((c) => `${c.time}: ${c.title}`).join("\n")}` : ""}

${metadata.tags && metadata.tags.length > 0 ? `\nTags: ${metadata.tags.join(", ")}` : ""}

Create detailed educational study notes explaining what this video covers. Make it comprehensive and suitable for exam preparation (at least 500 words).`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${await response.text()}`);
  }

  const result = await response.json();
  const content = result.content?.[0]?.text || "";

  if (content.length < 200) {
    throw new Error("Generated content too short");
  }

  console.log(`✅ [CLAUDE_METADATA] Generated ${content.length} characters`);
  return content;
}

// Validate transcript
function isValidTranscript(text: string): { valid: boolean; reason?: string } {
  console.log(`🔍 [VALIDATION] Validating transcript, length: ${text.length}`);

  if (text.length < 100) {
    return { valid: false, reason: "Transcript too short (< 100 characters)" };
  }

  const errorKeywords = ["could not", "cannot", "error", "failed to", "unable to", "not available", "access denied"];
  const lowerText = text.toLowerCase();

  for (const keyword of errorKeywords) {
    if (lowerText.includes(keyword)) {
      return { valid: false, reason: `Contains error keyword: "${keyword}"` };
    }
  }

  if (text.trim().startsWith("<")) {
    return { valid: false, reason: "Appears to be HTML/XML" };
  }

  console.log(`✅ [VALIDATION] Transcript is valid`);
  return { valid: true };
}

// Main handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let note_id: string | undefined;

  try {
    const { note_id: noteIdFromBody, source_url, language } = await req.json();
    note_id = noteIdFromBody;

    if (!note_id || !source_url) {
      return new Response(JSON.stringify({ error: "note_id and source_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🎬 Starting YouTube extraction for note:", note_id);
    console.log("📍 URL:", source_url);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    await supabase
      .from("study_notes")
      .update({ processing_status: "extracting", processing_progress: 15 })
      .eq("id", note_id);

    // Handle storage URL
    let youtubeUrl = source_url;
    if (source_url.includes("/storage/v1/object/")) {
      console.log("📦 Fetching YouTube URL from storage...");
      const urlParts = source_url.split("/storage/v1/object/");
      const pathWithoutPrefix = urlParts[1].replace(/^(public|authenticated)\//, "");
      const pathParts = pathWithoutPrefix.split("/");
      const bucket = pathParts[0];
      const filePath = pathParts.slice(1).join("/");

      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      if (error || !data) throw new Error("Failed to fetch YouTube URL from storage");

      youtubeUrl = (await data.text()).trim();
      console.log("✅ Extracted YouTube URL:", youtubeUrl);
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) throw new Error("Invalid YouTube URL");
    console.log("📹 Video ID:", videoId);

    // Fetch metadata
    const metadata = await fetchVideoMetadata(videoId);
    if (metadata) {
      console.log("✅ Metadata:", metadata.title);
      await supabase.from("study_notes").update({ title: metadata.title, processing_progress: 25 }).eq("id", note_id);
    }

    await supabase.from("study_notes").update({ processing_progress: 30 }).eq("id", note_id);

    // ✅ TRIPLE EXTRACTION STRATEGY
    console.log("📥 Starting triple-fallback transcript extraction...");

    let transcript: string;
    let timestampedTranscript: string;
    let segments: TranscriptSegment[] = [];
    let extractionMethod: string;
    let confidenceScore: number;

    try {
      // METHOD 1: youtube-transcript npm package (best quality, with timestamps)
      console.log("📥 Method 1: youtube-transcript package");
      const result = await fetchTranscriptWithYoutubeTranscript(videoId);
      transcript = result.text;
      timestampedTranscript = result.timestampedText;
      segments = result.segments;
      extractionMethod = "youtube-transcript";
      confidenceScore = 1.0;
      console.log("✅ Method 1 succeeded!");
    } catch (npmError) {
      console.log(
        "⚠️ Method 1 failed:",
        npmError instanceof Error ? npmError.message : String(npmError),
      );

      try {
        // METHOD 2: Timedtext API (fallback with timestamps)
        console.log("📥 Method 2: Timedtext API");
        const result = await fetchTranscriptFromTimedtext(videoId, language || "en");
        transcript = result.text;
        timestampedTranscript = result.timestampedText;
        segments = result.segments;
        extractionMethod = "timedtext";
        confidenceScore = 0.9;
        console.log("✅ Method 2 succeeded!");
      } catch (timedtextError) {
        console.log(
          "⚠️ Method 2 failed:",
          timedtextError instanceof Error ? timedtextError.message : String(timedtextError),
        );


      try {
        // METHOD 3: Claude Web Capability (AI extraction, no timestamps)
        console.log("📥 Method 3: Claude Web Capability");
        transcript = await fetchTranscriptWithClaudeWeb(youtubeUrl, metadata);
        timestampedTranscript = transcript;
        segments = [];
        extractionMethod = "claude-web";
        confidenceScore = 0.8;
        console.log("✅ Method 3 succeeded!");
      } catch (webError) {
        console.log("⚠️ Method 3 failed:", webError instanceof Error ? webError.message : String(webError));

        // METHOD 4: Metadata-based generation (last resort)
        console.log("📥 Method 4: Metadata-based generation");
        transcript = await generateContentFromMetadata(youtubeUrl, metadata);
        timestampedTranscript = transcript;
        segments = [];
        extractionMethod = "metadata";
        confidenceScore = 0.5;
        console.log("✅ Method 4 succeeded!");
      }
    }
    }

    // Validate
    const validation = isValidTranscript(transcript);
    if (!validation.valid) {
      throw new Error(`Invalid transcript: ${validation.reason}`);
    }

    console.log(`✅ Validated - ${transcript.length} chars, ${segments.length} segments`);

    const wordCount = transcript.split(/\s+/).filter((w) => w.length > 0).length;
    const readTime = Math.ceil(wordCount / 200);
    console.log(`📊 Stats: ${wordCount} words, ~${readTime} min, method: ${extractionMethod}`);

    // Update progress to 50% - transcript extraction complete
    await supabase.from("study_notes").update({ processing_progress: 50 }).eq("id", note_id);

    // Step 4: Trigger summarization (same pattern as PDF extraction)
    try {
      console.log("📝 Triggering summarization for note:", note_id);

      const summaryResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-notes-summary`, {
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
      });

      if (!summaryResponse.ok) {
        const errorText = await summaryResponse.text();
        console.error("❌ Summarization failed:", errorText);
        throw new Error(`Summarization failed: ${errorText}`);
      }

      console.log("✅ Summarization completed successfully for note:", note_id);
    } catch (triggerError) {
      console.error("❌ Failed to trigger or complete summarization:", triggerError);

      // Update note status to failed
      await supabase
        .from("study_notes")
        .update({
          processing_status: "failed",
          processing_error:
            triggerError instanceof Error ? triggerError.message : "Failed to complete summarization process",
        })
        .eq("id", note_id);

      throw triggerError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        note_id,
        extraction_method: extractionMethod,
        confidence_score: confidenceScore,
        extracted_length: transcript.length,
        word_count: wordCount,
        segments: segments.length,
        has_timestamps: segments.length > 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Error:", error);

    if (note_id) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase
        .from("study_notes")
        .update({
          processing_status: "failed",
          processing_error: error instanceof Error ? error.message : "Extraction failed",
          processing_progress: 0,
        })
        .eq("id", note_id);
    }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
