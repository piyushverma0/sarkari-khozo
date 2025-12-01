// Extract YouTube Transcript V3 - Multiple Innertube Clients + Fallbacks
// Tries ANDROID, iOS, TV clients to bypass LOGIN_REQUIRED restrictions

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

// Innertube client configurations that can bypass restrictions
const INNERTUBE_CLIENTS = [
  {
    name: "ANDROID",
    context: {
      client: {
        clientName: "ANDROID",
        clientVersion: "19.09.37",
        androidSdkVersion: 30,
        hl: "en",
        gl: "US",
        userAgent: "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
      },
    },
    headers: {
      "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
    },
  },
  {
    name: "IOS",
    context: {
      client: {
        clientName: "IOS",
        clientVersion: "19.09.3",
        deviceModel: "iPhone14,3",
        hl: "en",
        gl: "US",
        userAgent: "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
      },
    },
    headers: {
      "User-Agent": "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
    },
  },
  {
    name: "TV_EMBEDDED",
    context: {
      client: {
        clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
        clientVersion: "2.0",
        hl: "en",
        gl: "US",
      },
    },
    headers: {
      "User-Agent": "Mozilla/5.0 (PlayStation; PlayStation 5/5.10) AppleWebKit/601.2 (KHTML, like Gecko)",
    },
    thirdParty: { embedUrl: "https://www.youtube.com/" },
  },
  {
    name: "WEB_CREATOR",
    context: {
      client: {
        clientName: "WEB_CREATOR",
        clientVersion: "1.20231116.00.00",
        hl: "en",
        gl: "US",
      },
    },
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    },
  },
  {
    name: "MWEB",
    context: {
      client: {
        clientName: "MWEB",
        clientVersion: "2.20231219.00.00",
        hl: "en",
        gl: "US",
      },
    },
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
    },
  },
];

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

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Invidious public instances for free transcript extraction
const INVIDIOUS_INSTANCES = [
  'https://invidious.io',
  'https://yewtu.be',
  'https://vid.puffyan.us',
  'https://inv.nadeko.net',
  'https://invidious.snopyta.org',
  'https://invidious.kavin.rocks',
];

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
  ];

  const combinedText =
    `${metadata.title || ""} ${metadata.channelTitle || ""} ${(metadata.tags || []).join(" ")}`.toLowerCase();
  const isLikelyHindi = hindiIndicators.some((i) => combinedText.includes(i.toLowerCase()));
  const hasHindiText = /[\u0900-\u097F]/.test(metadata.title || "");

  if (isLikelyHindi || hasHindiText) {
    console.log(`🔧 [LANG_DETECT] Detected Hindi content`);
    return "hi";
  }
  return userLanguage || "en";
}

async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
  if (!YOUTUBE_API_KEY) {
    console.log("⚠️ YouTube API key not set");
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
    console.error("❌ Metadata fetch failed:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

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
// METHOD 1: Invidious API (FREE - Primary method)
// Uses public Invidious instances to get captions
// =====================================================
async function fetchTranscriptWithInvidious(
  videoId: string,
  preferredLang: string = "en",
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string; language: string }> {
  console.log(`🔧 [INVIDIOUS] Starting Invidious API extraction for: ${videoId}`);

  const errors: string[] = [];

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      console.log(`🔧 [INVIDIOUS] Trying instance: ${instance}`);

      // Fetch video info including captions
      const videoInfoUrl = `${instance}/api/v1/videos/${videoId}`;
      const videoResponse = await fetch(videoInfoUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!videoResponse.ok) {
        console.log(`🔧 [INVIDIOUS] ${instance}: HTTP ${videoResponse.status}`);
        errors.push(`${instance}: HTTP ${videoResponse.status}`);
        continue;
      }

      const videoData = await videoResponse.json();

      if (!videoData.captions || !Array.isArray(videoData.captions) || videoData.captions.length === 0) {
        console.log(`🔧 [INVIDIOUS] ${instance}: No captions available`);
        errors.push(`${instance}: No captions`);
        continue;
      }

      console.log(`✅ [INVIDIOUS] ${instance}: Found ${videoData.captions.length} caption track(s)!`);

      // Log available languages
      const availableLangs = videoData.captions.map((c: any) => c.language_code || c.label);
      console.log(`🔧 [INVIDIOUS] Available: ${availableLangs.join(", ")}`);

      // Select best caption track
      const langPriority = preferredLang === "hi" ? ["hi", "hi-IN", "en", "en-US"] : ["en", "en-US", "hi", "hi-IN"];

      let selectedCaption: any = null;
      for (const lang of langPriority) {
        selectedCaption = videoData.captions.find((c: any) => 
          c.language_code?.startsWith(lang.split("-")[0]) || c.label?.toLowerCase().includes(lang.toLowerCase())
        );
        if (selectedCaption) break;
      }

      if (!selectedCaption) selectedCaption = videoData.captions[0];

      const selectedLang = selectedCaption.language_code || selectedCaption.label || "unknown";
      console.log(`🔧 [INVIDIOUS] Selected: ${selectedLang}`);

      // Fetch caption content
      const captionUrl = selectedCaption.url;
      if (!captionUrl) {
        errors.push(`${instance}: No caption URL`);
        continue;
      }

      // Build full caption URL (relative URLs need instance prefix)
      const fullCaptionUrl = captionUrl.startsWith('http') ? captionUrl : `${instance}${captionUrl}`;
      
      const captionResponse = await fetch(fullCaptionUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
        },
      });

      if (!captionResponse.ok) {
        errors.push(`${instance}: Caption fetch failed`);
        continue;
      }

      const captionText = await captionResponse.text();
      
      // Try parsing as JSON3 format first
      try {
        const captionData = JSON.parse(captionText);
        
        if (captionData.events && Array.isArray(captionData.events)) {
          // JSON3 format (same as Innertube)
          const segments: TranscriptSegment[] = [];
          const textParts: string[] = [];
          const timestampedParts: string[] = [];

          for (const event of captionData.events) {
            if (!event?.segs || event.tStartMs === undefined) continue;
            const text = event.segs
              .filter((s: any) => s?.utf8)
              .map((s: any) => s.utf8)
              .join("")
              .trim();
            if (text && text !== "\n") {
              const startSeconds = Math.floor(event.tStartMs / 1000);
              const timeStr = formatTimestamp(startSeconds);
              segments.push({ time: timeStr, text, startSeconds });
              textParts.push(text);
              timestampedParts.push(`[${timeStr}] ${text}`);
            }
          }

          if (segments.length > 0) {
            console.log(`✅ [INVIDIOUS] ${instance}: Success! ${segments.length} segments, ${textParts.join(" ").length} chars`);
            return {
              segments,
              text: textParts.join(" "),
              timestampedText: timestampedParts.join("\n"),
              language: selectedLang,
            };
          }
        }
      } catch {
        // Not JSON3, try plain text
        if (captionText.length > 100) {
          console.log(`✅ [INVIDIOUS] ${instance}: Success with plain text! ${captionText.length} chars`);
          return {
            segments: [],
            text: captionText,
            timestampedText: captionText,
            language: selectedLang,
          };
        }
      }

      errors.push(`${instance}: Invalid caption format`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`🔧 [INVIDIOUS] ${instance}: Error - ${msg}`);
      errors.push(`${instance}: ${msg}`);
    }
  }

  throw new Error(`All Invidious instances failed: ${errors.join("; ")}`);
}

// =====================================================
// METHOD 2: Multi-Client Innertube API
// Tries multiple client types to bypass LOGIN_REQUIRED
// =====================================================
async function fetchTranscriptWithMultiClientInnertube(
  videoId: string,
  preferredLang: string = "en",
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string; language: string }> {
  console.log(`🔧 [INNERTUBE_MULTI] Starting multi-client extraction for: ${videoId}`);

  const errors: string[] = [];

  for (const clientConfig of INNERTUBE_CLIENTS) {
    try {
      console.log(`🔧 [INNERTUBE_MULTI] Trying client: ${clientConfig.name}`);

      // Adjust language in context
      const context = JSON.parse(JSON.stringify(clientConfig.context));
      context.client.hl = preferredLang === "hi" ? "hi" : "en";
      context.client.gl = preferredLang === "hi" ? "IN" : "US";

      const requestBody: any = {
        context,
        videoId,
        playbackContext: {
          contentPlaybackContext: {
            signatureTimestamp: 20073,
          },
        },
        racyCheckOk: true,
        contentCheckOk: true,
      };

      // Add thirdParty for embedded players
      if (clientConfig.thirdParty) {
        requestBody.thirdParty = clientConfig.thirdParty;
      }

      const fetchOptions: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Youtube-Client-Name": "1",
          ...clientConfig.headers,
        },
        body: JSON.stringify(requestBody),
      };

      const response = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", fetchOptions);

      if (!response.ok) {
        console.log(`🔧 [INNERTUBE_MULTI] ${clientConfig.name}: HTTP ${response.status}`);
        errors.push(`${clientConfig.name}: HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const playabilityStatus = data?.playabilityStatus?.status;
      console.log(`🔧 [INNERTUBE_MULTI] ${clientConfig.name}: Status = ${playabilityStatus}`);

      if (playabilityStatus === "ERROR" || playabilityStatus === "UNPLAYABLE") {
        errors.push(`${clientConfig.name}: ${playabilityStatus}`);
        continue;
      }

      if (playabilityStatus === "LOGIN_REQUIRED") {
        errors.push(`${clientConfig.name}: LOGIN_REQUIRED`);
        continue;
      }

      // Check for captions
      const captions = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!captions || !Array.isArray(captions) || captions.length === 0) {
        console.log(`🔧 [INNERTUBE_MULTI] ${clientConfig.name}: No caption tracks`);
        errors.push(`${clientConfig.name}: No captions`);
        continue;
      }

      console.log(`✅ [INNERTUBE_MULTI] ${clientConfig.name}: Found ${captions.length} caption track(s)!`);

      // Log available languages
      const availableLangs = captions.map((t: any) => `${t?.languageCode || "?"}(${t?.kind || "std"})`);
      console.log(`🔧 [INNERTUBE_MULTI] Available: ${availableLangs.join(", ")}`);

      // Select best track
      const langPriority = preferredLang === "hi" ? ["hi", "hi-IN", "en", "en-US"] : ["en", "en-US", "hi", "hi-IN"];

      let selectedTrack: any = null;
      for (const lang of langPriority) {
        selectedTrack = captions.find((t: any) => t?.languageCode?.startsWith(lang.split("-")[0]));
        if (selectedTrack) break;
      }
      if (!selectedTrack) selectedTrack = captions[0];

      if (!selectedTrack?.baseUrl) {
        errors.push(`${clientConfig.name}: No baseUrl`);
        continue;
      }

      const selectedLang = selectedTrack.languageCode || "unknown";
      console.log(`🔧 [INNERTUBE_MULTI] Selected: ${selectedLang}`);

      // Fetch transcript
      let transcriptUrl = selectedTrack.baseUrl;
      if (!transcriptUrl.includes("fmt=")) transcriptUrl += "&fmt=json3";

      const transcriptOptions: RequestInit = {
        headers: clientConfig.headers,
      };

      const transcriptResponse = await fetch(transcriptUrl, transcriptOptions);

      if (!transcriptResponse.ok) {
        errors.push(`${clientConfig.name}: Transcript fetch failed`);
        continue;
      }

      const transcriptData = await transcriptResponse.json();
      if (!transcriptData?.events || !Array.isArray(transcriptData.events)) {
        errors.push(`${clientConfig.name}: Invalid transcript format`);
        continue;
      }

      // Parse segments
      const segments: TranscriptSegment[] = [];
      const textParts: string[] = [];
      const timestampedParts: string[] = [];

      for (const event of transcriptData.events) {
        if (!event?.segs || event.tStartMs === undefined) continue;
        const text = event.segs
          .filter((s: any) => s?.utf8)
          .map((s: any) => s.utf8)
          .join("")
          .trim();
        if (text && text !== "\n") {
          const startSeconds = Math.floor(event.tStartMs / 1000);
          const timeStr = formatTimestamp(startSeconds);
          segments.push({ time: timeStr, text, startSeconds });
          textParts.push(text);
          timestampedParts.push(`[${timeStr}] ${text}`);
        }
      }

      if (segments.length === 0) {
        errors.push(`${clientConfig.name}: No segments`);
        continue;
      }

      const fullText = textParts.join(" ");
      console.log(
        `✅ [INNERTUBE_MULTI] ${clientConfig.name}: Success! ${segments.length} segments, ${fullText.length} chars`,
      );

      return {
        segments,
        text: fullText,
        timestampedText: timestampedParts.join("\n"),
        language: selectedLang,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`🔧 [INNERTUBE_MULTI] ${clientConfig.name}: Error - ${msg}`);
      errors.push(`${clientConfig.name}: ${msg}`);
    }
  }

  throw new Error(`All Innertube clients failed: ${errors.join("; ")}`);
}

// =====================================================
// METHOD 3: Direct Timedtext API with multiple variants
// =====================================================
async function fetchTranscriptWithTimedtextAPI(
  videoId: string,
  preferredLang: string = "en",
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string; language: string }> {
  console.log(`🔧 [TIMEDTEXT] Starting timedtext API extraction`);

  // Extended list of attempts including tlang (translation) parameter
  const attemptsToTry =
    preferredLang === "hi"
      ? [
          { lang: "hi", kind: "asr", tlang: "" },
          { lang: "hi", kind: "", tlang: "" },
          { lang: "en", kind: "asr", tlang: "hi" }, // English ASR translated to Hindi
          { lang: "en", kind: "asr", tlang: "" },
          { lang: "en", kind: "", tlang: "" },
        ]
      : [
          { lang: "en", kind: "asr", tlang: "" },
          { lang: "en", kind: "", tlang: "" },
          { lang: "hi", kind: "asr", tlang: "en" }, // Hindi ASR translated to English
          { lang: "hi", kind: "asr", tlang: "" },
          { lang: "hi", kind: "", tlang: "" },
        ];

  for (const attempt of attemptsToTry) {
    try {
      let url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${attempt.lang}&fmt=json3`;
      if (attempt.kind) url += `&kind=${attempt.kind}`;
      if (attempt.tlang) url += `&tlang=${attempt.tlang}`;

      console.log(
        `🔧 [TIMEDTEXT] Trying: ${attempt.lang}/${attempt.kind || "std"}${attempt.tlang ? "/→" + attempt.tlang : ""}`,
      );

      const fetchOptions: RequestInit = {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
        },
      };

      const response = await fetch(url, fetchOptions);

      if (!response.ok) continue;

      const text = await response.text();
      if (!text || text.trim().length < 20) continue;

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        continue;
      }

      if (!data?.events?.length) continue;

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
        const resultLang = attempt.tlang || attempt.lang;
        console.log(`✅ [TIMEDTEXT] Success! ${segments.length} segments in ${resultLang}`);
        return {
          segments,
          text: textParts.join(" "),
          timestampedText: timestampedParts.join("\n"),
          language: resultLang,
        };
      }
    } catch (error) {
      continue;
    }
  }

  throw new Error("No transcript via timedtext API");
}

// =====================================================
// METHOD 4: youtube-transcript NPM package
// =====================================================
async function fetchTranscriptWithNPM(
  videoId: string,
  preferredLang: string = "en",
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string; language: string }> {
  console.log(`📦 [NPM] Attempting npm package extraction`);

  const langsToTry = preferredLang === "hi" ? ["hi", "en"] : ["en", "hi"];

  for (const lang of langsToTry) {
    try {
      console.log(`📦 [NPM] Trying: ${lang}`);
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId, { textOnly: false, lang });

      if (!Array.isArray(transcriptData) || transcriptData.length === 0) continue;

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
        console.log(`✅ [NPM] Success! ${segments.length} segments`);
        return { segments, text: textParts.join(" "), timestampedText: timestampedParts.join("\n"), language: lang };
      }
    } catch (error) {
      console.log(`⚠️ [NPM] ${lang}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error("NPM package failed for all languages");
}

// =====================================================
// METHOD 5: Supadata API (Alternative transcript service - 100 free/month)
// =====================================================
async function fetchTranscriptWithSupadata(
  videoId: string,
): Promise<{ segments: TranscriptSegment[]; text: string; timestampedText: string; language: string }> {
  console.log(`🌐 [SUPADATA] Attempting Supadata API`);

  // Supadata is a free YouTube transcript API
  const url = `https://api.supadata.ai/v1/youtube/transcript?video_id=${videoId}&text=true`;

  const fetchOptions: RequestInit = {
    headers: {
      Accept: "application/json",
    },
  };

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`Supadata API failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data?.content && !data?.transcript) {
    throw new Error("No transcript in Supadata response");
  }

  // Supadata returns either content (plain text) or transcript (with timestamps)
  if (data.transcript && Array.isArray(data.transcript)) {
    const segments: TranscriptSegment[] = [];
    const textParts: string[] = [];
    const timestampedParts: string[] = [];

    for (const item of data.transcript) {
      const startSeconds = Math.floor(item.start || item.offset || 0);
      const timeStr = formatTimestamp(startSeconds);
      const text = (item.text || "").trim();
      if (text) {
        segments.push({ time: timeStr, text, startSeconds });
        textParts.push(text);
        timestampedParts.push(`[${timeStr}] ${text}`);
      }
    }

    if (segments.length > 0) {
      console.log(`✅ [SUPADATA] Success! ${segments.length} segments`);
      return {
        segments,
        text: textParts.join(" "),
        timestampedText: timestampedParts.join("\n"),
        language: data.lang || "unknown",
      };
    }
  }

  // If only plain text content
  if (data.content) {
    console.log(`✅ [SUPADATA] Success with plain text! ${data.content.length} chars`);
    return { segments: [], text: data.content, timestampedText: data.content, language: data.lang || "unknown" };
  }

  throw new Error("Could not parse Supadata response");
}

// =====================================================
// METHOD 6: Claude Web Search (Last resort for actual transcript)
// =====================================================
async function fetchTranscriptWithClaudeWeb(
  videoUrl: string,
  metadata: VideoMetadata | null,
  preferredLang: string = "en",
): Promise<{ text: string; language: string }> {
  console.log("🌐 [CLAUDE_WEB] Using Claude web search...");

  const systemPrompt = `You are a YouTube transcript extractor. Your ONLY job is to find and return the COMPLETE word-for-word transcript.

CRITICAL:
1. Use web search to find the ACTUAL TRANSCRIPT - not a summary
2. Search transcript sites: youtubetranscript.com, downsub.com, savesubs.com, kome.ai/tools/youtube-transcript-generator
3. Return the COMPLETE spoken words with timestamps if possible
4. A 108-minute video should have 10,000+ words - if you only find 200-300 words, that's a SUMMARY, not a transcript
5. For Hindi videos, return Hindi/Hinglish text

DO NOT:
- Summarize the video
- Return topic descriptions
- Return less than 1000 words for videos over 30 minutes`;

  const userPrompt = `Find the COMPLETE TRANSCRIPT for this YouTube video:

Video: ${videoUrl}
${
  metadata
    ? `Title: "${metadata.title}"
Channel: ${metadata.channelTitle}
Duration: ${metadata.duration}`
    : ""
}

SEARCH FOR:
1. "${metadata?.title || ""} transcript" site:youtubetranscript.com
2. "${metadata?.title || ""} transcript" site:downsub.com  
3. youtube video transcript "${videoUrl}"
4. "${metadata?.title || ""}" full captions text

Return the FULL TRANSCRIPT with timestamps. For a ${metadata?.duration || ""} video, I expect THOUSANDS of words.`;

  const result = await callClaude({
    systemPrompt,
    userPrompt,
    enableWebSearch: true,
    forceWebSearch: true,
    maxWebSearchUses: 10,
    maxTokens: 64000,
    temperature: 0.1,
  });

  logClaudeUsage("extract-youtube-transcript/claude-web", result.tokensUsed, result.webSearchUsed);

  const wordCount = result.content.split(/\s+/).filter((w: string) => w.length > 0).length;
  console.log(`✅ [CLAUDE_WEB] Extracted ${result.content.length} chars (${wordCount} words)`);

  // Warn if short
  if (metadata?.duration) {
    const match = metadata.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
      const totalMinutes = parseInt(match[1] || "0") * 60 + parseInt(match[2] || "0");
      if (totalMinutes > 30 && wordCount < totalMinutes * 50) {
        console.warn(`⚠️ [CLAUDE_WEB] Only ${wordCount} words for ${totalMinutes} min video - likely summary`);
      }
    }
  }

  if (wordCount < 50) throw new Error("Claude returned insufficient content");

  return { text: result.content, language: preferredLang };
}

// =====================================================
// METHOD 7: Generate from metadata (absolute last resort)
// =====================================================
async function generateFromMetadata(
  metadata: VideoMetadata | null,
  preferredLang: string = "en",
): Promise<{ text: string; language: string }> {
  console.log("⚠️ [METADATA_GEN] Generating from metadata - NOT REAL TRANSCRIPT");

  if (!metadata?.description || metadata.description.length < 100) {
    throw new Error("Insufficient metadata");
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
          content: `Create study notes from this video metadata (transcript unavailable):

Title: ${metadata.title}
Channel: ${metadata.channelTitle}  
Duration: ${metadata.duration}
Description: ${metadata.description}

${metadata.chapters?.length ? `Chapters:\n${metadata.chapters.map((c) => `${c.time}: ${c.title}`).join("\n")}` : ""}

Start with: "[AI-GENERATED FROM METADATA - ACTUAL TRANSCRIPT UNAVAILABLE]"
Create comprehensive notes (1000+ words).`,
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`API error: ${await response.text()}`);
  const result = await response.json();
  const content = result.content?.[0]?.text || "";
  if (content.length < 500) throw new Error("Generated content too short");
  return { text: content, language: preferredLang };
}

function isValidTranscript(text: string): boolean {
  if (!text || text.trim().length < 100) return false;
  const t = text.trim().toLowerCase();
  if (t.startsWith("<html") || t.startsWith("<?xml")) return false;
  return true;
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

    console.log("🎬 Starting extraction for note:", note_id);
    console.log("📍 URL:", source_url);
    if (language) console.log("🌐 User language:", language);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase
      .from("study_notes")
      .update({ processing_status: "extracting", processing_progress: 15 })
      .eq("id", note_id);

    // Handle storage URL
    let youtubeUrl = source_url;
    if (source_url.includes("/storage/v1/object/")) {
      console.log("📦 Fetching URL from storage...");
      const urlParts = source_url.split("/storage/v1/object/");
      const pathWithoutPrefix = urlParts[1].replace(/^(public|authenticated)\//, "");
      const pathParts = pathWithoutPrefix.split("/");
      const bucket = pathParts[0];
      const filePath = pathParts.slice(1).join("/");
      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      if (error || !data) throw new Error("Failed to fetch URL from storage");
      youtubeUrl = (await data.text()).trim();
      console.log("✅ YouTube URL:", youtubeUrl);
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) throw new Error("Invalid YouTube URL");
    console.log("📹 Video ID:", videoId);

    const metadata = await fetchVideoMetadata(videoId);
    if (metadata) {
      console.log("✅ Metadata:", metadata.title);
      await supabase.from("study_notes").update({ title: metadata.title, processing_progress: 25 }).eq("id", note_id);
    }

    const detectedLanguage = detectLanguageFromMetadata(metadata, language);
    console.log(`🌐 Language: ${detectedLanguage}`);

    await supabase.from("study_notes").update({ processing_progress: 30 }).eq("id", note_id);

    // =====================================================
    // 7-METHOD EXTRACTION CASCADE (ALL FREE)
    // Priority: Invidious (most reliable free) → Others → AI
    // =====================================================
    console.log("📥 Starting 7-method extraction cascade...");

    let transcript: string;
    let timestampedTranscript: string;
    let segments: TranscriptSegment[] = [];
    let extractionMethod: string;
    let confidenceScore: number;
    let extractedLanguage: string = detectedLanguage;

    // METHOD 1: Invidious API (FREE - Best reliability)
    try {
      console.log("📥 Method 1: Invidious API");
      const result = await fetchTranscriptWithInvidious(videoId, detectedLanguage);
      transcript = result.text;
      timestampedTranscript = result.timestampedText;
      segments = result.segments;
      extractionMethod = "invidious-api";
      confidenceScore = 1.0;
      extractedLanguage = result.language;
      console.log("✅ Method 1 succeeded!");
    } catch (e1) {
      console.log("⚠️ Method 1 failed:", e1 instanceof Error ? e1.message : String(e1));

      // METHOD 2: Multi-Client Innertube
      try {
        console.log("📥 Method 2: Multi-Client Innertube API");
        const result = await fetchTranscriptWithMultiClientInnertube(videoId, detectedLanguage);
        transcript = result.text;
        timestampedTranscript = result.timestampedText;
        segments = result.segments;
        extractionMethod = "innertube-multi-client";
        confidenceScore = 0.99;
        extractedLanguage = result.language;
        console.log("✅ Method 2 succeeded!");
      } catch (e2) {
        console.log("⚠️ Method 2 failed:", e2 instanceof Error ? e2.message : String(e2));

        // METHOD 3: Timedtext API
        try {
          console.log("📥 Method 3: Timedtext API");
          const result = await fetchTranscriptWithTimedtextAPI(videoId, detectedLanguage);
          transcript = result.text;
          timestampedTranscript = result.timestampedText;
          segments = result.segments;
          extractionMethod = "timedtext-api";
          confidenceScore = 0.98;
          extractedLanguage = result.language;
          console.log("✅ Method 3 succeeded!");
        } catch (e3) {
          console.log("⚠️ Method 3 failed:", e3 instanceof Error ? e3.message : String(e3));

          // METHOD 4: NPM Package
          try {
            console.log("📥 Method 4: NPM package");
            const result = await fetchTranscriptWithNPM(videoId, detectedLanguage);
            transcript = result.text;
            timestampedTranscript = result.timestampedText;
            segments = result.segments;
            extractionMethod = "npm-package";
            confidenceScore = 0.95;
            extractedLanguage = result.language;
            console.log("✅ Method 4 succeeded!");
          } catch (e4) {
            console.log("⚠️ Method 4 failed:", e4 instanceof Error ? e4.message : String(e4));

            // METHOD 5: Supadata API
            try {
              console.log("📥 Method 5: Supadata API");
              const result = await fetchTranscriptWithSupadata(videoId);
              transcript = result.text;
              timestampedTranscript = result.timestampedText;
              segments = result.segments;
              extractionMethod = "supadata";
              confidenceScore = 0.92;
              extractedLanguage = result.language;
              console.log("✅ Method 5 succeeded!");
            } catch (e5) {
              console.log("⚠️ Method 5 failed:", e5 instanceof Error ? e5.message : String(e5));

              // METHOD 6: Claude Web Search
              try {
                console.log("📥 Method 6: Claude Web Search");
                const result = await fetchTranscriptWithClaudeWeb(youtubeUrl, metadata, detectedLanguage);
                transcript = result.text;
                timestampedTranscript = result.text;
                extractionMethod = "claude-web-search";
                confidenceScore = 0.8;
                extractedLanguage = result.language;
                console.log("✅ Method 6 succeeded!");
              } catch (e6) {
                console.log("⚠️ Method 6 failed:", e6 instanceof Error ? e6.message : String(e6));

                // METHOD 7: Metadata generation (LAST RESORT)
                console.log("📥 Method 7: Metadata generation (LAST RESORT)");
                const result = await generateFromMetadata(metadata, detectedLanguage);
                transcript = result.text;
                timestampedTranscript = result.text;
                extractionMethod = "metadata-generated";
                confidenceScore = 0.5;
                extractedLanguage = result.language;
                console.log("⚠️ Method 7 succeeded - AI-generated content");
              }
            }
          }
        }
      }
    }

    if (!isValidTranscript(transcript)) {
      throw new Error("Invalid transcript content");
    }

    const wordCount = transcript.split(/\s+/).filter((w) => w.length > 0).length;
    console.log(`✅ Validated: ${transcript.length} chars, ${segments.length} segments, ${wordCount} words`);
    console.log(`📊 Method: ${extractionMethod}, Language: ${extractedLanguage}`);

    await supabase.from("study_notes").update({ processing_progress: 50 }).eq("id", note_id);

    // Trigger summarization
    console.log("📝 Triggering summarization...");
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
      throw new Error(`Summarization failed: ${await summaryResponse.text()}`);
    }

    console.log("✅ Summarization completed for note:", note_id);

    return new Response(
      JSON.stringify({
        success: true,
        note_id,
        extraction_method: extractionMethod,
        confidence_score: confidenceScore,
        word_count: wordCount,
        segments: segments.length,
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
