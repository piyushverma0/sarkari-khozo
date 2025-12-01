// Extract YouTube Transcript V3 - Innertube POST API + Multiple Fallbacks
// This version uses YouTube's internal POST API instead of scraping HTML
// 6-method extraction: Innertube POST → Direct Timedtext → NPM Package → transcript.io → Claude Web → Metadata

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

// Format seconds to MM:SS or HH:MM:SS
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Detect language from video metadata
function detectLanguageFromMetadata(metadata: VideoMetadata | null, userLanguage?: string): string {
  if (userLanguage && userLanguage !== "en") return userLanguage;
  if (!metadata) return userLanguage || "en";

  const hindiIndicators = [
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
    "PW",
    "Physics Wallah",
    "Unacademy",
    "Vedantu",
    "BYJU",
    "Alakh Pandey",
    "OnlyIAS",
    "Drishti IAS",
    "PYQs",
    "One Shot",
    "Complete Chapter",
    "Full Chapter",
    "Revision",
    "Marathon",
    "Crash Course",
  ];

  const combinedText =
    `${metadata.title || ""} ${metadata.channelTitle || ""} ${(metadata.tags || []).join(" ")}`.toLowerCase();
  const isLikelyHindi = hindiIndicators.some((i) => combinedText.includes(i.toLowerCase()));
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
    if (!response.ok) throw new Error(`YouTube API error: ${response.statusText}`);
    const data = await response.json();
    if (!data.items || data.items.length === 0) throw new Error("Video not found");
    const video = data.items[0];
    return {
      videoId,
      title: video.snippet.title,
      description: video.snippet.description,
      channelTitle: video.snippet.channelTitle,
      duration: video.contentDetails.duration,
      viewCount: parseInt(video.statistics.viewCount || "0"),
      publishedAt: video.snippet.publishedAt,
      tags: video.snippet.tags || [],
      categoryId: video.snippet.categoryId,
      chapters: extractChaptersFromDescription(video.snippet.description),
      detectedLanguage: video.snippet.defaultAudioLanguage || video.snippet.defaultLanguage,
    };
  } catch (error) {
    console.error("❌ Failed to fetch YouTube metadata:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

// Extract chapters from description
function extractChaptersFromDescription(description: string): Array<{ time: string; title: string }> {
  const chapters: Array<{ time: string; title: string }> = [];
  const lines = description.split("\n");
  const timestampRegex = /^(\d{1,2}:?\d{2}:?\d{2})\s+(.+)$/;
  for (const line of lines) {
    const match = line.trim().match(timestampRegex);
    if (match) chapters.push({ time: match[1], title: match[2].trim() });
  }
  return chapters;
}

// =====================================================
// METHOD 1: INNERTUBE POST API (Most Reliable)
// Uses YouTube's internal API directly - doesn't rely on HTML scraping
// =====================================================
async function fetchTranscriptWithInnertubePostAPI(
  videoId: string,
  preferredLang: string = "en",
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string; language: string }> {
  console.log(`🔧 [INNERTUBE_POST] Starting Innertube POST API extraction for video: ${videoId}`);
  console.log(`🔧 [INNERTUBE_POST] Preferred language: ${preferredLang}`);

  try {
    // Step 1: Call YouTube's Innertube player API
    const innertubeUrl = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

    const requestBody = {
      context: {
        client: {
          hl: preferredLang === "hi" ? "hi" : "en",
          gl: preferredLang === "hi" ? "IN" : "US",
          clientName: "WEB",
          clientVersion: "2.20241201.00.00",
          originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
          platform: "DESKTOP",
        },
        user: { lockedSafetyMode: false },
        request: { useSsl: true, internalExperimentFlags: [], consistencyTokenJars: [] },
      },
      videoId: videoId,
      playbackContext: {
        contentPlaybackContext: {
          vis: 0,
          splay: false,
          autoCaptionsDefaultOn: false,
          autonavState: "STATE_NONE",
          html5Preference: "HTML5_PREF_WANTS",
          signatureTimestamp: 20073,
        },
      },
      racyCheckOk: false,
      contentCheckOk: false,
    };

    console.log(`🔧 [INNERTUBE_POST] Calling Innertube player API...`);

    const response = await fetch(innertubeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
        Origin: "https://www.youtube.com",
        Referer: `https://www.youtube.com/watch?v=${videoId}`,
        "X-Youtube-Client-Name": "1",
        "X-Youtube-Client-Version": "2.20241201.00.00",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Innertube API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`🔧 [INNERTUBE_POST] Got response from Innertube API`);

    // Debug: Check what we got
    const playabilityStatus = data?.playabilityStatus?.status;
    console.log(`🔧 [INNERTUBE_POST] Playability status: ${playabilityStatus}`);

    if (playabilityStatus === "ERROR" || playabilityStatus === "UNPLAYABLE") {
      throw new Error(`Video not available: ${data?.playabilityStatus?.reason || playabilityStatus}`);
    }

    // Step 2: Extract caption tracks
    const captions = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captions || !Array.isArray(captions) || captions.length === 0) {
      const hasCaptions = !!data?.captions;
      const hasRenderer = !!data?.captions?.playerCaptionsTracklistRenderer;
      console.log(`🔧 [INNERTUBE_POST] Debug - hasCaptions: ${hasCaptions}, hasRenderer: ${hasRenderer}`);

      // Check if captions are in a different location
      const translationLanguages = data?.captions?.playerCaptionsTracklistRenderer?.translationLanguages;
      if (translationLanguages) {
        console.log(
          `🔧 [INNERTUBE_POST] Found ${translationLanguages.length} translation languages but no caption tracks`,
        );
      }

      throw new Error("No caption tracks found in Innertube API response");
    }

    console.log(`🔧 [INNERTUBE_POST] Found ${captions.length} caption track(s)`);

    // Log available languages
    const availableLangs = captions.map((t: any) => ({
      lang: t?.languageCode || "unknown",
      name: t?.name?.simpleText || t?.name?.runs?.[0]?.text || "unnamed",
      kind: t?.kind || "standard",
    }));
    console.log(`🔧 [INNERTUBE_POST] Available captions:`, JSON.stringify(availableLangs));

    // Step 3: Select best caption track
    const langPriority =
      preferredLang === "hi" || preferredLang === "hindi"
        ? ["hi", "hi-IN", "hi-Latn", "en", "en-US", "en-IN"]
        : ["en", "en-US", "en-IN", "en-GB", preferredLang, "hi", "hi-IN"];

    let selectedTrack: any = null;
    for (const lang of langPriority) {
      selectedTrack = captions.find((track: any) => {
        const trackLang = track?.languageCode;
        if (!trackLang) return false;
        return trackLang === lang || trackLang.startsWith(lang.split("-")[0]);
      });
      if (selectedTrack) break;
    }

    if (!selectedTrack) {
      selectedTrack = captions[0];
      console.log(`🔧 [INNERTUBE_POST] Using fallback track (first available)`);
    }

    if (!selectedTrack?.baseUrl) {
      throw new Error("No valid caption track with baseUrl found");
    }

    const selectedLang = selectedTrack.languageCode || "unknown";
    const trackKind = selectedTrack.kind || "standard";
    console.log(`🔧 [INNERTUBE_POST] Selected track: ${selectedLang} (${trackKind})`);

    // Step 4: Fetch transcript from baseUrl with JSON format
    let transcriptUrl = selectedTrack.baseUrl;
    if (!transcriptUrl.includes("fmt=")) {
      transcriptUrl += "&fmt=json3";
    } else {
      transcriptUrl = transcriptUrl.replace(/fmt=[^&]+/, "fmt=json3");
    }

    console.log(`🔧 [INNERTUBE_POST] Fetching transcript from caption URL...`);

    const transcriptResponse = await fetch(transcriptUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
    });

    if (!transcriptResponse.ok) {
      throw new Error(`Failed to fetch transcript: ${transcriptResponse.status}`);
    }

    const transcriptData = await transcriptResponse.json();

    if (!transcriptData?.events || !Array.isArray(transcriptData.events)) {
      throw new Error("Invalid transcript data format - no events array");
    }

    // Step 5: Parse transcript events
    const segments: TranscriptSegment[] = [];
    const textParts: string[] = [];
    const timestampedParts: string[] = [];

    for (const event of transcriptData.events) {
      if (!event?.segs || event.tStartMs === undefined) continue;

      const text = event.segs
        .filter((seg: any) => seg?.utf8)
        .map((seg: any) => seg.utf8)
        .join("")
        .trim();

      if (text && text !== "\n") {
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
      throw new Error("No valid segments extracted from transcript");
    }

    const fullText = textParts.join(" ");
    const timestampedText = timestampedParts.join("\n");

    console.log(`✅ [INNERTUBE_POST] Success! Extracted ${segments.length} segments`);
    console.log(
      `✅ [INNERTUBE_POST] Language: ${selectedLang}, Total: ${fullText.length} characters, Words: ${fullText.split(/\s+/).length}`,
    );

    return { segments, text: fullText, timestampedText, language: selectedLang };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ [INNERTUBE_POST] Failed:`, errorMessage);
    throw error;
  }
}

// =====================================================
// METHOD 2: Direct Timedtext API with ASR variants
// =====================================================
async function fetchTranscriptWithTimedtextAPI(
  videoId: string,
  preferredLang: string = "en",
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string; language: string }> {
  console.log(`🔧 [TIMEDTEXT] Starting direct timedtext API extraction for video: ${videoId}`);

  // Try multiple combinations of language and ASR
  const attemptsToTry =
    preferredLang === "hi" || preferredLang === "hindi"
      ? [
          { lang: "hi", kind: "asr" },
          { lang: "hi", kind: "" },
          { lang: "en", kind: "asr" },
          { lang: "en", kind: "" },
        ]
      : [
          { lang: "en", kind: "asr" },
          { lang: "en", kind: "" },
          { lang: "hi", kind: "asr" },
          { lang: "hi", kind: "" },
        ];

  for (const attempt of attemptsToTry) {
    try {
      let url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${attempt.lang}&fmt=json3`;
      if (attempt.kind) {
        url += `&kind=${attempt.kind}`;
      }

      console.log(`🔧 [TIMEDTEXT] Trying: lang=${attempt.lang}, kind=${attempt.kind || "standard"}`);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
        },
      });

      if (!response.ok) {
        console.log(`🔧 [TIMEDTEXT] HTTP ${response.status} for ${attempt.lang}/${attempt.kind}`);
        continue;
      }

      const text = await response.text();
      if (!text || text.trim().length < 20) {
        console.log(`🔧 [TIMEDTEXT] Empty response for ${attempt.lang}/${attempt.kind}`);
        continue;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.log(`🔧 [TIMEDTEXT] Not valid JSON for ${attempt.lang}/${attempt.kind}`);
        continue;
      }

      if (!data?.events || !Array.isArray(data.events) || data.events.length === 0) {
        console.log(`🔧 [TIMEDTEXT] No events for ${attempt.lang}/${attempt.kind}`);
        continue;
      }

      // Parse transcript
      const segments: TranscriptSegment[] = [];
      const textParts: string[] = [];
      const timestampedParts: string[] = [];

      for (const event of data.events) {
        if (!event?.segs || event.tStartMs === undefined) continue;
        const segText = event.segs
          .filter((s: any) => s?.utf8)
          .map((s: any) => s.utf8)
          .join("")
          .trim();
        if (segText && segText !== "\n") {
          const startSeconds = Math.floor(event.tStartMs / 1000);
          const timeStr = formatTimestamp(startSeconds);
          segments.push({ time: timeStr, text: segText, startSeconds });
          textParts.push(segText);
          timestampedParts.push(`[${timeStr}] ${segText}`);
        }
      }

      if (segments.length > 0) {
        console.log(`✅ [TIMEDTEXT] Success with ${attempt.lang}/${attempt.kind}! ${segments.length} segments`);
        return {
          segments,
          text: textParts.join(" "),
          timestampedText: timestampedParts.join("\n"),
          language: attempt.lang,
        };
      }
    } catch (error) {
      console.log(
        `🔧 [TIMEDTEXT] Error for ${attempt.lang}/${attempt.kind}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error("No transcript available via timedtext API");
}

// =====================================================
// METHOD 3: youtube-transcript NPM package
// =====================================================
async function fetchTranscriptWithYoutubeTranscript(
  videoId: string,
  preferredLang: string = "en",
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string; language: string }> {
  console.log(`📦 [NPM] Attempting youtube-transcript package extraction`);

  const langsToTry = preferredLang === "hi" ? ["hi", "en"] : ["en", "hi", preferredLang];
  let lastError: Error | null = null;

  for (const lang of langsToTry) {
    try {
      console.log(`📦 [NPM] Trying language: ${lang}`);
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId, { textOnly: false, lang });

      if (typeof transcriptData === "string" || !Array.isArray(transcriptData) || transcriptData.length === 0) continue;

      console.log(`📦 [NPM] Retrieved ${transcriptData.length} segments for ${lang}`);

      const segments: TranscriptSegment[] = [];
      const textParts: string[] = [];
      const timestampedParts: string[] = [];

      for (const item of transcriptData) {
        const startSeconds = Math.floor((item.offset || 0) / 1000);
        const timeStr = formatTimestamp(startSeconds);
        const text = (item.text || "").trim();
        if (text) {
          segments.push({ time: timeStr, text, startSeconds });
          textParts.push(text);
          timestampedParts.push(`[${timeStr}] ${text}`);
        }
      }

      if (segments.length > 0) {
        console.log(`✅ [NPM] Success! ${segments.length} segments in ${lang}`);
        return { segments, text: textParts.join(" "), timestampedText: timestampedParts.join("\n"), language: lang };
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`⚠️ [NPM] Failed for ${lang}: ${lastError.message}`);
    }
  }

  throw lastError || new Error("No transcript from youtube-transcript package");
}

// =====================================================
// METHOD 4: youtube-transcript.io API
// =====================================================
async function fetchTranscriptWithYoutubeTranscriptIO(
  videoId: string,
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string; language: string }> {
  console.log(`🌐 [TRANSCRIPT_IO] Attempting youtube-transcript.io API`);

  const apiKey = Deno.env.get("YOUTUBE_TRANSCRIPT_IO_API_KEY");
  if (!apiKey) throw new Error("YOUTUBE_TRANSCRIPT_IO_API_KEY not configured");

  const response = await fetch("https://www.youtube-transcript.io/api/transcripts", {
    method: "POST",
    headers: { Authorization: `Basic ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [videoId] }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limited");
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0 || !data[0].transcript) {
    throw new Error("No transcript data returned from youtube-transcript.io");
  }

  const transcript = data[0].transcript;
  const detectedLang = data[0].language || "unknown";
  console.log(`🌐 [TRANSCRIPT_IO] Retrieved ${transcript.length} segments, language: ${detectedLang}`);

  const segments: TranscriptSegment[] = [];
  const textParts: string[] = [];
  const timestampedParts: string[] = [];

  for (const item of transcript) {
    const startSeconds = Math.floor(item.offset || 0);
    const timeStr = formatTimestamp(startSeconds);
    const text = (item.text || "").trim();
    if (text) {
      segments.push({ time: timeStr, text, startSeconds });
      textParts.push(text);
      timestampedParts.push(`[${timeStr}] ${text}`);
    }
  }

  if (segments.length === 0) throw new Error("No valid segments extracted");

  console.log(`✅ [TRANSCRIPT_IO] Success! ${segments.length} segments`);
  return { segments, text: textParts.join(" "), timestampedText: timestampedParts.join("\n"), language: detectedLang };
}

// =====================================================
// METHOD 5: Claude Web Search
// =====================================================
async function fetchTranscriptWithClaudeWeb(
  videoUrl: string,
  metadata: VideoMetadata | null,
  preferredLang: string = "en",
): Promise<{ text: string; language: string }> {
  console.log("🌐 [CLAUDE_WEB] Using Claude web search for transcript...");

  const languageNote = preferredLang === "hi" ? "The video is in Hindi. Return Hindi/Hinglish content." : "";

  const systemPrompt = `You are a YouTube transcript extractor. Your job is to find and return the COMPLETE TRANSCRIPT of videos.

CRITICAL RULES:
1. You MUST use web search to find the actual transcript/captions
2. Search for third-party transcript sites like youtubetranscript.com, downsub.com, savesubs.com
3. Return the COMPLETE WORD-BY-WORD transcript, NOT a summary
4. Do NOT summarize - we need the actual spoken words
5. Include timestamps if available in format [MM:SS] text

${languageNote}`;

  const userPrompt = `Find the COMPLETE TRANSCRIPT for this YouTube video.

Video: ${videoUrl}
${
  metadata
    ? `Title: "${metadata.title}"
Channel: ${metadata.channelTitle}
Duration: ${metadata.duration}`
    : ""
}

SEARCH STRATEGIES TO TRY:
1. "${metadata?.title || ""} full transcript"
2. "youtube transcript ${videoUrl}"
3. site:youtubetranscript.com OR site:downsub.com

Return the FULL transcript text with timestamps, not a summary. For a ${metadata?.duration || ""} video, I expect thousands of words.`;

  const result = await callClaude({
    systemPrompt,
    userPrompt,
    enableWebSearch: true,
    forceWebSearch: true,
    maxWebSearchUses: 8,
    maxTokens: 32000,
    temperature: 0.2,
  });

  logClaudeUsage("extract-youtube-transcript/claude-web", result.tokensUsed, result.webSearchUsed);

  const wordCount = result.content.split(/\s+/).filter((w: string) => w.length > 0).length;

  if (result.content.length < 200 || wordCount < 50) {
    throw new Error("Claude web search returned insufficient content");
  }

  // Warn if short for long video
  if (metadata?.duration) {
    const match = metadata.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
      const totalMinutes = parseInt(match[1] || "0") * 60 + parseInt(match[2] || "0");
      const expectedMin = totalMinutes * 50;
      if (totalMinutes > 30 && wordCount < expectedMin) {
        console.warn(
          `⚠️ [CLAUDE_WEB] Content short for ${totalMinutes} min video (${wordCount} words, expected ${expectedMin}+)`,
        );
      }
    }
  }

  console.log(`✅ [CLAUDE_WEB] Extracted ${result.content.length} chars (${wordCount} words)`);
  return { text: result.content, language: preferredLang };
}

// =====================================================
// METHOD 6: Generate from metadata (last resort)
// =====================================================
async function generateContentFromMetadata(
  metadata: VideoMetadata | null,
  preferredLang: string = "en",
): Promise<{ text: string; language: string }> {
  console.log("🌐 [METADATA_GEN] Generating from metadata (LAST RESORT)");
  console.log("⚠️ WARNING: This is AI-generated, NOT actual transcript");

  if (!metadata || !metadata.description || metadata.description.length < 100) {
    throw new Error("Insufficient metadata for generation");
  }

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
          content: `Create educational study notes based on this video metadata (transcript unavailable):

Title: ${metadata.title}
Channel: ${metadata.channelTitle}
Duration: ${metadata.duration}
Description: ${metadata.description}

${metadata.chapters?.length ? `Chapters:\n${metadata.chapters.map((c) => `${c.time}: ${c.title}`).join("\n")}` : ""}

Create comprehensive study notes (1000+ words). Start with: "[NOTE: AI-generated from metadata - actual transcript unavailable]"`,
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${await response.text()}`);
  const result = await response.json();
  const content = result.content?.[0]?.text || "";
  if (content.length < 500) throw new Error("Generated content too short");
  console.log(`✅ [METADATA_GEN] Generated ${content.length} characters`);
  return { text: content, language: preferredLang };
}

// Validate transcript
function isValidTranscript(text: string): { valid: boolean; reason?: string } {
  if (!text || text.trim().length === 0) return { valid: false, reason: "Empty" };
  if (text.trim().length < 100) return { valid: false, reason: "Too short" };
  const trimmed = text.trim().toLowerCase();
  if (trimmed.startsWith("<html") || trimmed.startsWith("<?xml")) return { valid: false, reason: "HTML error page" };
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
    if (language) console.log("🌐 User specified language:", language);

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

    const detectedLanguage = detectLanguageFromMetadata(metadata, language);
    console.log(`🌐 Detected/Selected language: ${detectedLanguage}`);

    await supabase.from("study_notes").update({ processing_progress: 30 }).eq("id", note_id);

    // =====================================================
    // 6-METHOD EXTRACTION STRATEGY
    // =====================================================
    console.log("📥 Starting 6-method fallback transcript extraction...");

    let transcript: string;
    let timestampedTranscript: string;
    let segments: TranscriptSegment[] = [];
    let extractionMethod: string;
    let confidenceScore: number;
    let extractedLanguage: string = detectedLanguage;

    // METHOD 1: Innertube POST API (Most reliable - uses internal API)
    try {
      console.log("📥 Method 1: Innertube POST API");
      const result = await fetchTranscriptWithInnertubePostAPI(videoId, detectedLanguage);
      transcript = result.text;
      timestampedTranscript = result.timestampedText;
      segments = result.segments;
      extractionMethod = "innertube-post-api";
      confidenceScore = 1.0;
      extractedLanguage = result.language;
      console.log("✅ Method 1 succeeded!");
    } catch (e1) {
      console.log("⚠️ Method 1 failed:", e1 instanceof Error ? e1.message : String(e1));

      // METHOD 2: Direct Timedtext API
      try {
        console.log("📥 Method 2: Direct Timedtext API");
        const result = await fetchTranscriptWithTimedtextAPI(videoId, detectedLanguage);
        transcript = result.text;
        timestampedTranscript = result.timestampedText;
        segments = result.segments;
        extractionMethod = "timedtext-api";
        confidenceScore = 0.98;
        extractedLanguage = result.language;
        console.log("✅ Method 2 succeeded!");
      } catch (e2) {
        console.log("⚠️ Method 2 failed:", e2 instanceof Error ? e2.message : String(e2));

        // METHOD 3: NPM Package
        try {
          console.log("📥 Method 3: youtube-transcript NPM package");
          const result = await fetchTranscriptWithYoutubeTranscript(videoId, detectedLanguage);
          transcript = result.text;
          timestampedTranscript = result.timestampedText;
          segments = result.segments;
          extractionMethod = "youtube-transcript-npm";
          confidenceScore = 0.95;
          extractedLanguage = result.language;
          console.log("✅ Method 3 succeeded!");
        } catch (e3) {
          console.log("⚠️ Method 3 failed:", e3 instanceof Error ? e3.message : String(e3));

          // METHOD 4: youtube-transcript.io
          try {
            console.log("📥 Method 4: youtube-transcript.io API");
            const result = await fetchTranscriptWithYoutubeTranscriptIO(videoId);
            transcript = result.text;
            timestampedTranscript = result.timestampedText;
            segments = result.segments;
            extractionMethod = "youtube-transcript-io";
            confidenceScore = 0.92;
            extractedLanguage = result.language;
            console.log("✅ Method 4 succeeded!");
          } catch (e4) {
            console.log("⚠️ Method 4 failed:", e4 instanceof Error ? e4.message : String(e4));

            // METHOD 5: Claude Web Search
            try {
              console.log("📥 Method 5: Claude Web Search");
              const result = await fetchTranscriptWithClaudeWeb(youtubeUrl, metadata, detectedLanguage);
              transcript = result.text;
              timestampedTranscript = result.text;
              extractionMethod = "claude-web-search";
              confidenceScore = 0.8;
              extractedLanguage = result.language;
              console.log("✅ Method 5 succeeded!");
            } catch (e5) {
              console.log("⚠️ Method 5 failed:", e5 instanceof Error ? e5.message : String(e5));

              // METHOD 6: Metadata generation
              console.log("📥 Method 6: Metadata-based generation (LAST RESORT)");
              const result = await generateContentFromMetadata(metadata, detectedLanguage);
              transcript = result.text;
              timestampedTranscript = result.text;
              extractionMethod = "metadata-generated";
              confidenceScore = 0.5;
              extractedLanguage = result.language;
              console.log("⚠️ Method 6 succeeded - AI-generated, not real transcript");
            }
          }
        }
      }
    }

    // Validate
    const validation = isValidTranscript(transcript);
    if (!validation.valid) throw new Error(`Invalid transcript: ${validation.reason}`);

    const wordCount = transcript.split(/\s+/).filter((w) => w.length > 0).length;
    console.log(`✅ Validated - ${transcript.length} chars, ${segments.length} segments, lang: ${extractedLanguage}`);
    console.log(`📊 Stats: ${wordCount} words, method: ${extractionMethod}`);

    await supabase.from("study_notes").update({ processing_progress: 50 }).eq("id", note_id);

    // Trigger summarization
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
      throw new Error(`Summarization failed: ${errorText}`);
    }

    console.log("✅ Summarization completed for note:", note_id);

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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
