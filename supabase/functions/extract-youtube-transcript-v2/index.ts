// Extract YouTube Transcript V2 - Enhanced with Innertube API + Third-Party APIs + Claude Web Search
// 5-method extraction strategy: Innertube → youtube-transcript npm → youtube-transcript.io API → Claude Web Search → Metadata

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { YoutubeTranscript } from "jsr:@fbehrens/youtube-transcript@1.0.2";
import { callClaude, logClaudeUsage } from "../_shared/claude-client.ts";

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

// ✅ METHOD 1: Innertube API - Extract from ytInitialPlayerResponse (Most Reliable)
async function fetchTranscriptWithInnertube(
  videoId: string,
  preferredLang: string = "en"
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string }> {
  console.log(`🔧 [INNERTUBE] Starting Innertube API extraction for video: ${videoId}`);
  console.log(`🔧 [INNERTUBE] Preferred language: ${preferredLang}`);

  try {
    // Step 1: Fetch YouTube watch page
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`🔧 [INNERTUBE] Fetching watch page: ${watchUrl}`);
    
    const response = await fetch(watchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Cookie": "CONSENT=YES+cb.20240101-00-p0.en+FX+000; PREF=f6=40000000&tz=UTC",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch watch page: ${response.status}`);
    }

    const html = await response.text();
    console.log(`🔧 [INNERTUBE] Watch page fetched, length: ${html.length}`);

    // Step 2: Extract ytInitialPlayerResponse JSON - try multiple patterns
    let playerResponseMatch = html.match(/var ytInitialPlayerResponse\s*=\s*({.+?});/);
    
    // Try alternative patterns if first fails
    if (!playerResponseMatch) {
      playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});<\/script>/);
    }
    if (!playerResponseMatch) {
      playerResponseMatch = html.match(/"player":\s*({.+?"captions".+?})/);
    }
    
    if (!playerResponseMatch) {
      console.error("❌ [INNERTUBE] Could not find ytInitialPlayerResponse - HTML preview:");
      console.error(html.substring(0, 1000));
      throw new Error("Could not find ytInitialPlayerResponse in page HTML");
    }

    const playerResponse = JSON.parse(playerResponseMatch[1]);
    console.log(`🔧 [INNERTUBE] Successfully parsed ytInitialPlayerResponse`);

    // Step 3: Get caption tracks - try multiple paths
    let captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    
    // Try alternative path
    if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
      captionTracks = playerResponse?.captions?.playerCaptionsRenderer?.captionTracks;
    }
    
    // Try searching anywhere in captions object
    if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
      const captionsStr = JSON.stringify(playerResponse?.captions || {});
      const captionMatch = captionsStr.match(/"captionTracks":\s*(\[.+?\])/);
      if (captionMatch) {
        try {
          captionTracks = JSON.parse(captionMatch[1]);
          console.log(`🔧 [INNERTUBE] Found caption tracks via string search`);
        } catch (e) {
          console.warn(`⚠️ [INNERTUBE] Failed to parse caption tracks from string search`);
        }
      }
    }
    
    if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
      console.log(`🔧 [INNERTUBE] Caption object structure:`, JSON.stringify(playerResponse?.captions, null, 2).substring(0, 500));
      throw new Error("No caption tracks available for this video");
    }

    console.log(`🔧 [INNERTUBE] Found ${captionTracks.length} caption tracks`);
    
    // Find best matching language
    let selectedTrack = captionTracks.find((track: any) => 
      track.languageCode === preferredLang || track.languageCode.startsWith(preferredLang)
    );
    
    // Fallback to English
    if (!selectedTrack) {
      selectedTrack = captionTracks.find((track: any) => 
        track.languageCode === "en" || track.languageCode.startsWith("en")
      );
    }
    
    // Fallback to first available
    if (!selectedTrack) {
      selectedTrack = captionTracks[0];
    }

    console.log(`🔧 [INNERTUBE] Selected track language: ${selectedTrack.languageCode}`);

    // Step 4: Fetch transcript from signed baseUrl
    const transcriptUrl = selectedTrack.baseUrl + "&fmt=json3";
    console.log(`🔧 [INNERTUBE] Fetching transcript from signed URL`);
    
    const transcriptResponse = await fetch(transcriptUrl);
    if (!transcriptResponse.ok) {
      throw new Error(`Failed to fetch transcript: ${transcriptResponse.status}`);
    }

    const transcriptData = await transcriptResponse.json();
    console.log(`🔧 [INNERTUBE] Transcript data received`);

    // Step 5: Parse JSON3 format
    if (!transcriptData.events || !Array.isArray(transcriptData.events)) {
      throw new Error("Invalid transcript data format");
    }

    const segments: TranscriptSegment[] = [];
    const textParts: string[] = [];
    const timestampedParts: string[] = [];

    for (const event of transcriptData.events) {
      if (event.segs && event.tStartMs !== undefined) {
        const text = event.segs
          .map((seg: any) => seg.utf8)
          .filter((t: string) => t && t.trim())
          .join("")
          .trim();

        if (text) {
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

    if (segments.length === 0) {
      throw new Error("No valid segments extracted from transcript");
    }

    const fullText = textParts.join(" ");
    const timestampedText = timestampedParts.join("\n");

    console.log(`✅ [INNERTUBE] Success! Extracted ${segments.length} segments`);
    console.log(`✅ [INNERTUBE] Total text length: ${fullText.length} characters`);

    return {
      segments,
      text: fullText,
      timestampedText,
    };
  } catch (error) {
    console.error(`❌ [INNERTUBE] Failed:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// ✅ METHOD 2: youtube-transcript npm package
// (Moved from METHOD 3 for better ordering)

// ✅ METHOD 3: youtube-transcript.io API (Third-party free service)
async function fetchTranscriptWithYoutubeTranscriptIO(
  videoId: string
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string }> {
  console.log(`🌐 [TRANSCRIPT_IO] Attempting transcript extraction using youtube-transcript.io API`);
  console.log(`🌐 [TRANSCRIPT_IO] Video ID: ${videoId}`);

  try {
    const apiKey = Deno.env.get('YOUTUBE_TRANSCRIPT_IO_API_KEY');
    if (!apiKey) {
      throw new Error('YOUTUBE_TRANSCRIPT_IO_API_KEY not configured');
    }

    const apiUrl = 'https://www.youtube-transcript.io/api/transcripts';
    console.log(`🌐 [TRANSCRIPT_IO] Fetching from: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [videoId] }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`Rate limited. Retry after: ${retryAfter} seconds`);
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Response format: array of video objects
    if (!Array.isArray(data) || data.length === 0 || !data[0].transcript) {
      throw new Error("No transcript data returned from youtube-transcript.io");
    }

    const transcript = data[0].transcript;
    console.log(`🌐 [TRANSCRIPT_IO] Retrieved ${transcript.length} transcript segments`);

    const segments: TranscriptSegment[] = [];
    const textParts: string[] = [];
    const timestampedParts: string[] = [];

    for (const item of transcript) {
      const startSeconds = Math.floor(item.offset || 0);
      const timeStr = formatTimestamp(startSeconds);
      const text = (item.text || "").trim();

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

    console.log(`✅ [TRANSCRIPT_IO] Success! Extracted ${segments.length} segments`);
    console.log(`✅ [TRANSCRIPT_IO] Total text length: ${fullText.length} characters`);

    return {
      segments,
      text: fullText,
      timestampedText,
    };
  } catch (error) {
    console.error(`❌ [TRANSCRIPT_IO] Failed:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Helper function for youtube-transcript npm package (used as METHOD 2)
async function fetchTranscriptWithYoutubeTranscript(
  videoId: string
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string }> {
  console.log(`📦 [NPM_PACKAGE] Attempting transcript extraction using youtube-transcript package`);
  console.log(`📦 [NPM_PACKAGE] Video ID: ${videoId}`);

  try {
    // Fetch with textOnly: false to get structured TranscriptResponse[]
    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId, { textOnly: false });
    
    // Type guard: ensure we got an array, not a string
    if (typeof transcriptData === 'string' || !Array.isArray(transcriptData) || transcriptData.length === 0) {
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

// ✅ METHOD 3 (DEPRECATED): Fetch transcript using YouTube Timedtext API - Kept for backward compatibility
async function fetchTranscriptFromTimedtext(
  videoId: string,
  languageCode: string = "en",
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string }> {
  console.log(`🔍 [TIMEDTEXT_DEPRECATED] Starting transcript extraction for video: ${videoId}`);
  console.log(`🔍 [TIMEDTEXT_DEPRECATED] User preferred language: ${languageCode}`);

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

// ✅ METHOD 4: Use Claude Sonnet 4.5 with Web Search to extract transcript
async function fetchTranscriptWithClaudeWeb(videoUrl: string, metadata: VideoMetadata | null): Promise<string> {
  console.log("🌐 [CLAUDE_WEB_SEARCH] Using Claude Sonnet 4.5 with web search to extract transcript...");
  console.log("🌐 [CLAUDE_WEB_SEARCH] Video URL:", videoUrl);

  try {
    const systemPrompt = `You are a YouTube transcript extractor. Use web search to find and extract video transcripts.

CRITICAL: You MUST use web search to find current information about videos. Do not rely on training data.

Your task:
1. Search the web for the video and transcript
2. Extract the COMPLETE transcript with timestamps
3. Return ONLY transcript content - no explanations
4. If no transcript exists, provide a detailed summary from available information`;

    const userPrompt = `I need the transcript for this YouTube video RIGHT NOW. Search for it immediately.

Video: ${videoUrl}
${metadata ? `Title: "${metadata.title}"
Channel: ${metadata.channelTitle}` : ""}

SEARCH QUERIES TO TRY:
1. "${metadata?.title || videoUrl} transcript"
2. "${metadata?.title || videoUrl} captions"
3. Search directly for the video URL: ${videoUrl}

ACTION REQUIRED: Use web search NOW to find this video's transcript. Extract the complete content with timestamps if available.`;

    const result = await callClaude({
      systemPrompt,
      userPrompt,
      enableWebSearch: true,
      forceWebSearch: true,
      maxWebSearchUses: 5,
      maxTokens: 8000,
      temperature: 0.3,
    });

    logClaudeUsage("extract-youtube-transcript-v2/fetchTranscriptWithClaudeWeb", result.tokensUsed, result.webSearchUsed);

    if (!result.webSearchUsed) {
      console.warn("⚠️ [CLAUDE_WEB_SEARCH] Web search was not used - may have insufficient results");
    }

    if (result.content.length < 200) {
      throw new Error("Claude web search extraction returned insufficient content");
    }

    console.log(`✅ [CLAUDE_WEB_SEARCH] Extracted ${result.content.length} characters using web search`);
    console.log(`✅ [CLAUDE_WEB_SEARCH] Web search used: ${result.webSearchUsed}`);
    
    return result.content;
  } catch (error) {
    console.error("❌ [CLAUDE_WEB_SEARCH] Failed:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// METHOD 5: Generate content from metadata (last resort)
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

// Validate transcript - simplified to avoid false positives
function isValidTranscript(text: string): { valid: boolean; reason?: string } {
  console.log(`🔍 [VALIDATION] Validating transcript, length: ${text.length}`);

  // Empty check
  if (!text || text.trim().length === 0) {
    return { valid: false, reason: "Transcript is empty" };
  }

  // Minimum length check
  if (text.trim().length < 100) {
    return { valid: false, reason: "Transcript too short (< 100 characters)" };
  }

  // Only check for obvious HTML error pages
  const trimmed = text.trim();
  if (trimmed.startsWith("<html") || trimmed.startsWith("<?xml") || trimmed.startsWith("<!DOCTYPE")) {
    return { valid: false, reason: "Transcript appears to be an HTML error page" };
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

    // ✅ ENHANCED 5-METHOD EXTRACTION STRATEGY
    console.log("📥 Starting 5-method fallback transcript extraction with improved reliability...");

    let transcript: string;
    let timestampedTranscript: string;
    let segments: TranscriptSegment[] = [];
    let extractionMethod: string;
    let confidenceScore: number;

    try {
      // METHOD 1: Innertube API (most reliable, direct from YouTube)
      console.log("📥 Method 1: Innertube API (signed URLs)");
      const result = await fetchTranscriptWithInnertube(videoId, language || "en");
      transcript = result.text;
      timestampedTranscript = result.timestampedText;
      segments = result.segments;
      extractionMethod = "innertube-api";
      confidenceScore = 1.0;
      console.log("✅ Method 1 (Innertube) succeeded!");
    } catch (innertubeError) {
      console.log(
        "⚠️ Method 1 (Innertube) failed:",
        innertubeError instanceof Error ? innertubeError.message : String(innertubeError)
      );

      try {
        // METHOD 2: youtube-transcript npm package
        console.log("📥 Method 2: youtube-transcript npm package");
        const result = await fetchTranscriptWithYoutubeTranscript(videoId);
        transcript = result.text;
        timestampedTranscript = result.timestampedText;
        segments = result.segments;
        extractionMethod = "youtube-transcript-npm";
        confidenceScore = 0.98;
        console.log("✅ Method 2 (NPM Package) succeeded!");
      } catch (npmError) {
        console.log(
          "⚠️ Method 2 (NPM Package) failed:",
          npmError instanceof Error ? npmError.message : String(npmError)
        );

        try {
          // METHOD 3: youtube-transcript.io API (third-party free service)
          console.log("📥 Method 3: youtube-transcript.io API");
          const result = await fetchTranscriptWithYoutubeTranscriptIO(videoId);
          transcript = result.text;
          timestampedTranscript = result.timestampedText;
          segments = result.segments;
          extractionMethod = "youtube-transcript-io";
          confidenceScore = 0.95;
          console.log("✅ Method 3 (youtube-transcript.io) succeeded!");
        } catch (transcriptIoError) {
          console.log(
            "⚠️ Method 3 (youtube-transcript.io) failed:",
            transcriptIoError instanceof Error ? transcriptIoError.message : String(transcriptIoError)
          );

          try {
            // METHOD 4: Claude Sonnet 4.5 with FORCED Web Search
            console.log("📥 Method 4: Claude Sonnet 4.5 with FORCED web search");
            transcript = await fetchTranscriptWithClaudeWeb(youtubeUrl, metadata);
            timestampedTranscript = transcript;
            extractionMethod = "claude-web-search";
            confidenceScore = 0.85;
            console.log("✅ Method 4 (Claude Web Search) succeeded!");
          } catch (claudeWebError) {
            console.log(
              "⚠️ Method 4 (Claude Web Search) failed:",
              claudeWebError instanceof Error ? claudeWebError.message : String(claudeWebError)
            );

            // METHOD 5: Metadata-based generation (last resort)
            console.log("📥 Method 5: Metadata-based generation (last resort - NOT A TRANSCRIPT)");
            transcript = await generateContentFromMetadata(youtubeUrl, metadata);
            timestampedTranscript = transcript;
            extractionMethod = "metadata-generated";
            confidenceScore = 0.5;
            console.log("⚠️ Method 5 (Metadata) succeeded - this is AI-generated summary, not a real transcript");
          }
        }
      }
    }

    // Validate with fallback
    let validation = isValidTranscript(transcript);
    if (!validation.valid) {
      console.log("⚠️ Transcript failed validation:", validation.reason);
      console.log("⚠️ Transcript preview (first 300 chars):", transcript.slice(0, 300));

      // If we haven't yet used metadata-based generation, try it as a last resort
      if (extractionMethod !== "metadata-generated") {
        try {
          console.log("📥 Trying metadata-based generation as fallback after validation failure...");
          transcript = await generateContentFromMetadata(youtubeUrl, metadata);
          timestampedTranscript = transcript;
          segments = [];
          extractionMethod = "metadata-generated";
          confidenceScore = 0.5;

          validation = isValidTranscript(transcript);
          if (!validation.valid) {
            throw new Error(`Invalid transcript after metadata fallback: ${validation.reason}`);
          }
          console.log("✅ Fallback metadata-based content validated successfully");
        } catch (fallbackError) {
          console.error("❌ Metadata fallback also failed:", fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
          throw new Error(
            validation.reason?.includes("system-like error")
              ? "No transcript available for this video: captions disabled and AI could not access content."
              : `Invalid transcript: ${validation.reason}`,
          );
        }
      } else {
        throw new Error(`Invalid transcript: ${validation.reason}`);
      }
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
          video_url: youtubeUrl,
          video_title: metadata?.title || null,
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
