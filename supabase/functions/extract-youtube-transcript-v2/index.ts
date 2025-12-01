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
  detectedLanguage?: string;
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

// Helper: Format seconds to MM:SS or HH:MM:SS
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Detect language from video metadata (especially for Indian educational content)
function detectLanguageFromMetadata(metadata: VideoMetadata | null, userLanguage?: string): string {
  // If user explicitly specified a language, use it
  if (userLanguage && userLanguage !== "en") {
    return userLanguage;
  }

  if (!metadata) {
    return userLanguage || "en";
  }

  // Hindi/Indian educational content indicators
  const hindiIndicators = [
    // Exam names
    "NEET",
    "UPSC",
    "JEE",
    "SSC",
    "NCERT",
    "CBSE",
    "ICSE",
    "IIT",
    "Class 11",
    "Class 12",
    "Class 10",
    "Class 9",
    "कक्षा",
    "हिंदी",
    "Hindi Medium",
    // Common Hindi educational channels
    "PW",
    "Physics Wallah",
    "Unacademy",
    "Vedantu",
    "BYJU",
    "Alakh Pandey",
    "OnlyIAS",
    "Drishti IAS",
    // Subject indicators in Hindi context
    "PYQs",
    "One Shot",
    "Complete Chapter",
    "Full Chapter",
    "Revision",
    "Marathon",
    "Crash Course",
  ];

  const titleAndChannel = `${metadata.title || ""} ${metadata.channelTitle || ""}`.toLowerCase();
  const tags = (metadata.tags || []).join(" ").toLowerCase();
  const combinedText = `${titleAndChannel} ${tags}`;

  // Check for Hindi indicators
  const isLikelyHindi = hindiIndicators.some((indicator) => combinedText.includes(indicator.toLowerCase()));

  // Check for explicit Hindi in title/description
  const hasHindiText =
    /[\u0900-\u097F]/.test(metadata.title || "") || /[\u0900-\u097F]/.test(metadata.description || "");

  if (isLikelyHindi || hasHindiText) {
    console.log(`🔧 [LANG_DETECT] Detected Hindi content based on metadata indicators`);
    return "hi";
  }

  return userLanguage || "en";
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
      detectedLanguage: snippet.defaultAudioLanguage || snippet.defaultLanguage,
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

// ✅ METHOD 1: Innertube API - Extract from ytInitialPlayerResponse (Most Reliable)
// FIXED: Better caption URL extraction directly from HTML
async function fetchTranscriptWithInnertube(
  videoId: string,
  preferredLang: string = "en",
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string; language: string }> {
  console.log(`🔧 [INNERTUBE] Starting Innertube API extraction for video: ${videoId}`);
  console.log(`🔧 [INNERTUBE] Preferred language: ${preferredLang}`);

  try {
    // Step 1: Fetch YouTube watch page
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`🔧 [INNERTUBE] Fetching watch page: ${watchUrl}`);

    const response = await fetch(watchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
        Cookie: "CONSENT=YES+cb.20240101-00-p0.en+FX+000; PREF=f6=40000000&tz=UTC",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch watch page: ${response.status}`);
    }

    const html = await response.text();
    console.log(`🔧 [INNERTUBE] Watch page fetched, length: ${html.length}`);

    // Step 2: IMPROVED - Search for caption tracks directly in HTML
    // This is more reliable than trying to parse the entire ytInitialPlayerResponse
    let captionTracks: any[] = [];

    // Method A: Find captionTracks array directly
    const captionTracksMatch = html.match(/"captionTracks"\s*:\s*(\[[\s\S]*?\])\s*,\s*"audioTracks"/);
    if (captionTracksMatch) {
      try {
        captionTracks = JSON.parse(captionTracksMatch[1]);
        console.log(`🔧 [INNERTUBE] Found caption tracks via direct search (Method A)`);
      } catch (e) {
        console.log(`⚠️ [INNERTUBE] Method A parse failed, trying alternatives...`);
      }
    }

    // Method B: Find baseUrl patterns for timedtext
    if (captionTracks.length === 0) {
      const baseUrlMatches = html.matchAll(/"baseUrl"\s*:\s*"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]+)"/g);
      for (const match of baseUrlMatches) {
        const baseUrl = match[1].replace(/\\u0026/g, "&");
        // Extract language from URL
        const langMatch = baseUrl.match(/lang=([a-z]{2}(?:-[A-Z]{2})?)/);
        const lang = langMatch ? langMatch[1] : "unknown";
        captionTracks.push({ baseUrl, languageCode: lang });
        console.log(`🔧 [INNERTUBE] Found caption URL via Method B: ${lang}`);
      }
    }

    // Method C: Search for timedtext URLs more broadly
    if (captionTracks.length === 0) {
      const timedtextPattern = /https:\/\/www\.youtube\.com\/api\/timedtext\?[^"'\s]+/g;
      const timedtextMatches = html.match(timedtextPattern);
      if (timedtextMatches) {
        for (const url of timedtextMatches) {
          const cleanUrl = url.replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
          const langMatch = cleanUrl.match(/lang=([a-z]{2}(?:-[A-Z]{2})?)/);
          const lang = langMatch ? langMatch[1] : "unknown";
          // Avoid duplicates
          if (!captionTracks.some((t) => t.languageCode === lang)) {
            captionTracks.push({ baseUrl: cleanUrl, languageCode: lang });
            console.log(`🔧 [INNERTUBE] Found caption URL via Method C: ${lang}`);
          }
        }
      }
    }

    // Method D: Try to find in playerCaptionsTracklistRenderer
    if (captionTracks.length === 0) {
      const rendererMatch = html.match(
        /"playerCaptionsTracklistRenderer"\s*:\s*\{[^}]*"captionTracks"\s*:\s*(\[[^\]]+\])/,
      );
      if (rendererMatch) {
        try {
          captionTracks = JSON.parse(rendererMatch[1]);
          console.log(`🔧 [INNERTUBE] Found caption tracks via Method D`);
        } catch (e) {
          console.log(`⚠️ [INNERTUBE] Method D parse failed`);
        }
      }
    }

    if (captionTracks.length === 0) {
      // Log what we can find for debugging
      const hasCaptions = html.includes('"captions"');
      const hasCaptionTracks = html.includes('"captionTracks"');
      const hasTimedtext = html.includes("timedtext");
      console.log(
        `🔧 [INNERTUBE] Debug - hasCaptions: ${hasCaptions}, hasCaptionTracks: ${hasCaptionTracks}, hasTimedtext: ${hasTimedtext}`,
      );

      throw new Error("No caption tracks found in page HTML");
    }

    console.log(`🔧 [INNERTUBE] Found ${captionTracks.length} caption track(s)`);

    // Log all available languages
    const availableLangs = captionTracks.map((t: any) => t?.languageCode || "unknown");
    console.log(`🔧 [INNERTUBE] Available languages: ${availableLangs.join(", ")}`);

    // Build language priority list based on preferred language
    const langPriority =
      preferredLang === "hi" || preferredLang === "hindi"
        ? ["hi", "hi-IN", "hi-Latn", "en", "en-US", "en-IN", "en-GB"]
        : ["en", "en-US", "en-IN", "en-GB", preferredLang, "hi", "hi-IN"];

    // Find best matching track
    let selectedTrack: any = null;

    for (const lang of langPriority) {
      selectedTrack = captionTracks.find((track: any) => {
        const trackLang = track?.languageCode;
        if (!trackLang) return false;
        return trackLang === lang || trackLang.startsWith(lang.split("-")[0]);
      });
      if (selectedTrack) break;
    }

    // Fallback to first available track
    if (!selectedTrack) {
      selectedTrack = captionTracks[0];
      console.log(`🔧 [INNERTUBE] Using fallback track (first available)`);
    }

    if (!selectedTrack) {
      throw new Error("No suitable caption track found");
    }

    const selectedLang = selectedTrack?.languageCode || "unknown";
    console.log(`🔧 [INNERTUBE] Selected track: ${selectedLang}`);

    // Step 3: Get the baseUrl
    let baseUrl = selectedTrack?.baseUrl;
    if (!baseUrl || typeof baseUrl !== "string") {
      throw new Error("Caption track has no download URL (baseUrl missing)");
    }

    // Clean and prepare the URL
    baseUrl = baseUrl.replace(/\\u0026/g, "&").replace(/&amp;/g, "&");

    // Add fmt=json3 if not present
    const transcriptUrl = baseUrl.includes("fmt=") ? baseUrl : `${baseUrl}&fmt=json3`;
    console.log(`🔧 [INNERTUBE] Fetching transcript from URL`);

    const transcriptResponse = await fetch(transcriptUrl);
    if (!transcriptResponse.ok) {
      throw new Error(`Failed to fetch transcript: ${transcriptResponse.status} ${transcriptResponse.statusText}`);
    }

    const transcriptData = await transcriptResponse.json();
    console.log(`🔧 [INNERTUBE] Transcript data received`);

    // Step 4: Parse JSON3 format
    if (!transcriptData || !transcriptData.events || !Array.isArray(transcriptData.events)) {
      throw new Error("Invalid transcript data format (no events array)");
    }

    const segments: TranscriptSegment[] = [];
    const textParts: string[] = [];
    const timestampedParts: string[] = [];

    for (const event of transcriptData.events) {
      // Skip events without segments or timing
      if (!event || !event.segs || event.tStartMs === undefined || event.tStartMs === null) {
        continue;
      }

      const text = event.segs
        .filter((seg: any) => seg && typeof seg.utf8 === "string")
        .map((seg: any) => seg.utf8)
        .join("")
        .trim();

      if (text && text.length > 0) {
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

    if (segments.length === 0) {
      throw new Error("No valid segments extracted from transcript data");
    }

    const fullText = textParts.join(" ");
    const timestampedText = timestampedParts.join("\n");

    console.log(`✅ [INNERTUBE] Success! Extracted ${segments.length} segments`);
    console.log(`✅ [INNERTUBE] Language: ${selectedLang}, Total text: ${fullText.length} characters`);

    return {
      segments,
      text: fullText,
      timestampedText,
      language: selectedLang,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ [INNERTUBE] Failed:`, errorMessage);
    throw error;
  }
}

// ✅ METHOD 2: youtube-transcript npm package
async function fetchTranscriptWithYoutubeTranscript(
  videoId: string,
  preferredLang: string = "en",
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string; language: string }> {
  console.log(`📦 [NPM_PACKAGE] Attempting transcript extraction using youtube-transcript package`);
  console.log(`📦 [NPM_PACKAGE] Video ID: ${videoId}, Preferred language: ${preferredLang}`);

  // Try languages in order of preference
  const langsToTry = preferredLang === "hi" || preferredLang === "hindi" ? ["hi", "en"] : ["en", "hi", preferredLang];

  let lastError: Error | null = null;

  for (const lang of langsToTry) {
    try {
      console.log(`📦 [NPM_PACKAGE] Trying language: ${lang}`);

      // Fetch with textOnly: false to get structured TranscriptResponse[]
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId, {
        textOnly: false,
        lang: lang,
      });

      // Type guard: ensure we got an array, not a string
      if (typeof transcriptData === "string" || !Array.isArray(transcriptData) || transcriptData.length === 0) {
        console.log(`📦 [NPM_PACKAGE] No data for language: ${lang}`);
        continue;
      }

      console.log(`📦 [NPM_PACKAGE] Retrieved ${transcriptData.length} transcript segments for language: ${lang}`);

      const segments: TranscriptSegment[] = [];
      const textParts: string[] = [];
      const timestampedParts: string[] = [];

      for (const item of transcriptData) {
        const startSeconds = Math.floor((item.offset || 0) / 1000);
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
        continue;
      }

      const fullText = textParts.join(" ");
      const timestampedText = timestampedParts.join("\n");

      console.log(`✅ [NPM_PACKAGE] Success! Extracted ${segments.length} segments in ${lang}`);
      console.log(`✅ [NPM_PACKAGE] Total text length: ${fullText.length} characters`);

      return {
        segments,
        text: fullText,
        timestampedText,
        language: lang,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`⚠️ [NPM_PACKAGE] Failed for ${lang}:`, lastError.message);
      continue;
    }
  }

  throw lastError || new Error("No transcript available from youtube-transcript package");
}

// ✅ METHOD 3: youtube-transcript.io API (Third-party free service)
async function fetchTranscriptWithYoutubeTranscriptIO(
  videoId: string,
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string; language: string }> {
  console.log(`🌐 [TRANSCRIPT_IO] Attempting transcript extraction using youtube-transcript.io API`);
  console.log(`🌐 [TRANSCRIPT_IO] Video ID: ${videoId}`);

  try {
    const apiKey = Deno.env.get("YOUTUBE_TRANSCRIPT_IO_API_KEY");
    if (!apiKey) {
      throw new Error("YOUTUBE_TRANSCRIPT_IO_API_KEY not configured");
    }

    const apiUrl = "https://www.youtube-transcript.io/api/transcripts";
    console.log(`🌐 [TRANSCRIPT_IO] Fetching from: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: [videoId] }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
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
    const detectedLang = data[0].language || "unknown";
    console.log(`🌐 [TRANSCRIPT_IO] Retrieved ${transcript.length} transcript segments, language: ${detectedLang}`);

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
      language: detectedLang,
    };
  } catch (error) {
    console.error(`❌ [TRANSCRIPT_IO] Failed:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// ✅ METHOD 4: Use Claude Sonnet 4.5 with Web Search to extract transcript
async function fetchTranscriptWithClaudeWeb(
  videoUrl: string,
  metadata: VideoMetadata | null,
  preferredLang: string = "en",
): Promise<{ text: string; language: string }> {
  console.log("🌐 [CLAUDE_WEB_SEARCH] Using Claude Sonnet 4.5 with web search to extract transcript...");
  console.log("🌐 [CLAUDE_WEB_SEARCH] Video URL:", videoUrl);

  try {
    const languageInstruction =
      preferredLang === "hi"
        ? "The video is likely in Hindi. Search for Hindi transcripts or captions. Return content in Hindi/Hinglish if that's what's available."
        : "Search for transcripts in any available language.";

    const systemPrompt = `You are a YouTube transcript extractor. Use web search to find and extract video transcripts.

CRITICAL INSTRUCTIONS:
1. You MUST use web search to find the actual transcript/captions for this video
2. Search for third-party transcript sites like: youtubetranscript.com, downsub.com, savesubs.com, etc.
3. Extract the COMPLETE transcript - not a summary. We need the actual spoken words.
4. If you find a transcript, return ALL of it with timestamps if available
5. DO NOT summarize or paraphrase - we need the actual transcript text
6. If the video is in Hindi, return the Hindi text (Devanagari or Romanized)

${languageInstruction}`;

    const userPrompt = `I need the COMPLETE TRANSCRIPT (not a summary) for this YouTube video.

Video: ${videoUrl}
${
  metadata
    ? `Title: "${metadata.title}"
Channel: ${metadata.channelTitle}
Duration: ${metadata.duration}`
    : ""
}

IMPORTANT: This is a ${metadata?.duration || "long"} educational video. I need the FULL transcript, not a summary.

SEARCH STRATEGIES - TRY ALL OF THESE:
1. Search: "${metadata?.title || ""} full transcript"
2. Search: "youtube transcript ${videoUrl}"
3. Search: site:youtubetranscript.com OR site:downsub.com "${metadata?.title || ""}"
4. Search for any third-party site that has this video's captions

If you cannot find the complete transcript, clearly state that and provide whatever content you can find from the video.`;

    const result = await callClaude({
      systemPrompt,
      userPrompt,
      enableWebSearch: true,
      forceWebSearch: true,
      maxWebSearchUses: 8, // More searches to try harder
      maxTokens: 32000, // Much larger for full transcripts
      temperature: 0.2,
    });

    logClaudeUsage(
      "extract-youtube-transcript-v2/fetchTranscriptWithClaudeWeb",
      result.tokensUsed,
      result.webSearchUsed,
    );

    if (!result.webSearchUsed) {
      console.warn("⚠️ [CLAUDE_WEB_SEARCH] Web search was not used - may have insufficient results");
    }

    // Check if the result is substantial enough
    const wordCount = result.content.split(/\s+/).filter((w: string) => w.length > 0).length;

    if (result.content.length < 200 || wordCount < 50) {
      throw new Error("Claude web search extraction returned insufficient content");
    }

    // Warn if content seems too short for a long video
    if (metadata?.duration) {
      const durationMatch = metadata.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1] || "0");
        const minutes = parseInt(durationMatch[2] || "0");
        const totalMinutes = hours * 60 + minutes;

        // Expected: ~150 words per minute of video for a transcript
        const expectedMinWords = totalMinutes * 50; // Conservative: 50 words/min

        if (totalMinutes > 30 && wordCount < expectedMinWords) {
          console.warn(
            `⚠️ [CLAUDE_WEB_SEARCH] Content seems short for ${totalMinutes} min video (${wordCount} words, expected ~${expectedMinWords}+) - likely a summary, not full transcript`,
          );
        }
      }
    }

    console.log(
      `✅ [CLAUDE_WEB_SEARCH] Extracted ${result.content.length} characters (${wordCount} words) using web search`,
    );
    console.log(`✅ [CLAUDE_WEB_SEARCH] Web search used: ${result.webSearchUsed}`);

    return {
      text: result.content,
      language: preferredLang,
    };
  } catch (error) {
    console.error("❌ [CLAUDE_WEB_SEARCH] Failed:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// ✅ METHOD 5: Generate content from metadata (last resort)
async function generateContentFromMetadata(
  videoUrl: string,
  metadata: VideoMetadata | null,
  preferredLang: string = "en",
): Promise<{ text: string; language: string }> {
  console.log("🌐 [CLAUDE_METADATA] Generating content from metadata (LAST RESORT)...");
  console.log("⚠️ [CLAUDE_METADATA] WARNING: This is AI-generated summary, NOT actual transcript");

  if (!metadata || !metadata.description || metadata.description.length < 100) {
    throw new Error("Insufficient metadata to generate content");
  }

  console.log("🌐 [CLAUDE_METADATA] Using video metadata and description");

  const languageInstruction =
    preferredLang === "hi"
      ? "Generate the notes in Hindi if the content appears to be in Hindi, otherwise use English."
      : "Generate the notes in English.";

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
          content: `Create comprehensive educational notes based on this YouTube video's metadata. 

⚠️ IMPORTANT: The actual transcript was not available, so create detailed educational content based on what the video likely covers.

Title: ${metadata.title}
Channel: ${metadata.channelTitle}
Duration: ${metadata.duration}
Views: ${metadata.viewCount}

Description:
${metadata.description}

${metadata.chapters && metadata.chapters.length > 0 ? `\nChapters:\n${metadata.chapters.map((c) => `${c.time}: ${c.title}`).join("\n")}` : ""}

${metadata.tags && metadata.tags.length > 0 ? `\nTags: ${metadata.tags.join(", ")}` : ""}

${languageInstruction}

Create detailed educational study notes explaining what this video likely covers based on the title, description, and chapters. Structure the content with:
1. Main topic overview
2. Key concepts and definitions  
3. Important points from each chapter/section
4. Summary of key takeaways

Make it comprehensive and suitable for exam preparation (at least 1000 words).

BEGIN WITH: "[NOTE: This content is AI-generated based on video metadata as the actual transcript was unavailable]"`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${await response.text()}`);
  }

  const result = await response.json();
  const content = result.content?.[0]?.text || "";

  if (content.length < 500) {
    throw new Error("Generated content too short");
  }

  console.log(`✅ [CLAUDE_METADATA] Generated ${content.length} characters`);
  return {
    text: content,
    language: preferredLang,
  };
}

// Validate transcript
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

  // Check for HTML error pages
  const trimmed = text.trim().toLowerCase();
  if (trimmed.startsWith("<html") || trimmed.startsWith("<?xml") || trimmed.startsWith("<!doctype")) {
    return { valid: false, reason: "Transcript appears to be an HTML error page" };
  }

  // Check for common error messages
  const errorPatterns = [
    "video unavailable",
    "this video is private",
    "this video has been removed",
    "sign in to confirm your age",
    "content warning",
  ];

  for (const pattern of errorPatterns) {
    if (trimmed.includes(pattern)) {
      return { valid: false, reason: `Transcript contains error message: ${pattern}` };
    }
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
    console.log("🌐 User specified language:", language || "not specified");

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

    // Detect language from metadata
    const detectedLanguage = detectLanguageFromMetadata(metadata, language);
    console.log(`🌐 Detected/Selected language: ${detectedLanguage}`);

    await supabase.from("study_notes").update({ processing_progress: 30 }).eq("id", note_id);

    // ✅ ENHANCED 5-METHOD EXTRACTION STRATEGY
    console.log("📥 Starting 5-method fallback transcript extraction...");

    let transcript: string;
    let timestampedTranscript: string;
    let segments: TranscriptSegment[] = [];
    let extractionMethod: string;
    let confidenceScore: number;
    let extractedLanguage: string = detectedLanguage;

    try {
      // METHOD 1: Innertube API (most reliable, direct from YouTube)
      console.log("📥 Method 1: Innertube API (direct caption URL extraction)");
      const result = await fetchTranscriptWithInnertube(videoId, detectedLanguage);
      transcript = result.text;
      timestampedTranscript = result.timestampedText;
      segments = result.segments;
      extractionMethod = "innertube-api";
      confidenceScore = 1.0;
      extractedLanguage = result.language;
      console.log("✅ Method 1 (Innertube) succeeded!");
    } catch (innertubeError) {
      console.log(
        "⚠️ Method 1 (Innertube) failed:",
        innertubeError instanceof Error ? innertubeError.message : String(innertubeError),
      );

      try {
        // METHOD 2: youtube-transcript npm package
        console.log("📥 Method 2: youtube-transcript npm package");
        const result = await fetchTranscriptWithYoutubeTranscript(videoId, detectedLanguage);
        transcript = result.text;
        timestampedTranscript = result.timestampedText;
        segments = result.segments;
        extractionMethod = "youtube-transcript-npm";
        confidenceScore = 0.98;
        extractedLanguage = result.language;
        console.log("✅ Method 2 (NPM Package) succeeded!");
      } catch (npmError) {
        console.log(
          "⚠️ Method 2 (NPM Package) failed:",
          npmError instanceof Error ? npmError.message : String(npmError),
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
          extractedLanguage = result.language;
          console.log("✅ Method 3 (youtube-transcript.io) succeeded!");
        } catch (transcriptIoError) {
          console.log(
            "⚠️ Method 3 (youtube-transcript.io) failed:",
            transcriptIoError instanceof Error ? transcriptIoError.message : String(transcriptIoError),
          );

          try {
            // METHOD 4: Claude Sonnet 4.5 with FORCED Web Search
            console.log("📥 Method 4: Claude Sonnet 4.5 with FORCED web search");
            const result = await fetchTranscriptWithClaudeWeb(youtubeUrl, metadata, detectedLanguage);
            transcript = result.text;
            timestampedTranscript = result.text; // No timestamps from web search
            extractionMethod = "claude-web-search";
            confidenceScore = 0.85;
            extractedLanguage = result.language;
            console.log("✅ Method 4 (Claude Web Search) succeeded!");
          } catch (claudeWebError) {
            console.log(
              "⚠️ Method 4 (Claude Web Search) failed:",
              claudeWebError instanceof Error ? claudeWebError.message : String(claudeWebError),
            );

            // METHOD 5: Metadata-based generation (last resort)
            console.log("📥 Method 5: Metadata-based generation (LAST RESORT - NOT A TRANSCRIPT)");
            const result = await generateContentFromMetadata(youtubeUrl, metadata, detectedLanguage);
            transcript = result.text;
            timestampedTranscript = result.text;
            extractionMethod = "metadata-generated";
            confidenceScore = 0.5;
            extractedLanguage = result.language;
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
          const result = await generateContentFromMetadata(youtubeUrl, metadata, detectedLanguage);
          transcript = result.text;
          timestampedTranscript = result.text;
          segments = [];
          extractionMethod = "metadata-generated";
          confidenceScore = 0.5;
          extractedLanguage = result.language;

          validation = isValidTranscript(transcript);
          if (!validation.valid) {
            throw new Error(`Invalid transcript after metadata fallback: ${validation.reason}`);
          }
          console.log("✅ Fallback metadata-based content validated successfully");
        } catch (fallbackError) {
          console.error(
            "❌ Metadata fallback also failed:",
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          );
          throw new Error(
            `No transcript available for this video. Captions may be disabled. Error: ${validation.reason}`,
          );
        }
      } else {
        throw new Error(`Invalid transcript: ${validation.reason}`);
      }
    }

    console.log(
      `✅ Validated - ${transcript.length} chars, ${segments.length} segments, language: ${extractedLanguage}`,
    );

    const wordCount = transcript.split(/\s+/).filter((w) => w.length > 0).length;
    const readTime = Math.ceil(wordCount / 200);
    console.log(`📊 Stats: ${wordCount} words, ~${readTime} min read, method: ${extractionMethod}`);

    // Update progress to 50% - transcript extraction complete
    await supabase.from("study_notes").update({ processing_progress: 50 }).eq("id", note_id);

    // Step 4: Trigger summarization
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
          timestamped_content: timestampedTranscript,
          language: extractedLanguage,
          video_url: youtubeUrl,
          video_title: metadata?.title || null,
          extraction_method: extractionMethod,
          confidence_score: confidenceScore,
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
        language: extractedLanguage,
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
