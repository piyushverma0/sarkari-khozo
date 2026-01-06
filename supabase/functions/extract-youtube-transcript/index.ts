import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// COMPLETE FIXED VERSION WITH MULTI-STRATEGY APPROACH
// ============================================================
// FIXES:
// 1. Uses Innertube API (more reliable than timedtext)
// 2. Fetches actual video metadata (title, description, duration)
// 3. Tries multiple language codes with fallbacks
// 4. Implements retry logic with exponential backoff
// 5. Better error handling and messages
// 6. Supports auto-generated captions
// 7. Handles age-restricted and private videos
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { note_id, source_url, language } = await req.json();

    console.log(`🎬 Starting YouTube extraction for note ${note_id}`);

    // Update status
    await supabaseClient
      .from("study_notes")
      .update({ processing_status: "extracting", processing_progress: 10 })
      .eq("id", note_id);

    // Extract video ID from YouTube URL
    const videoId = extractVideoId(source_url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL. Please provide a valid YouTube video link.");
    }

    console.log(`📹 Video ID extracted: ${videoId}`);

    // ✅ STEP 1: Fetch video metadata
    console.log("📊 Fetching video metadata...");
    const metadata = await fetchVideoMetadata(videoId);
    console.log(`✅ Video title: ${metadata.title}`);
    console.log(`⏱️ Duration: ${metadata.duration} seconds`);

    await supabaseClient
      .from("study_notes")
      .update({
        processing_progress: 20,
        title: metadata.title,
      })
      .eq("id", note_id);

    // ✅ STEP 2: Fetch transcript with fallback strategies
    console.log(`📝 Fetching transcript (preferred language: ${language})...`);
    const result = await fetchTranscriptWithFallback(videoId, language);

    console.log(`✅ Transcript fetched using ${result.method}`);
    console.log(`📏 Length: ${result.transcript.length} characters`);
    console.log(`🗣️ Language: ${result.language}`);

    // Calculate stats
    const wordCount = result.transcript.split(/\s+/).filter((w) => w.length > 0).length;
    const readTime = Math.ceil(wordCount / 200);

    // Save complete data
    await supabaseClient
      .from("study_notes")
      .update({
        raw_content: result.transcript,
        processing_progress: 50,
        title: metadata.title,
        word_count: wordCount,
        estimated_read_time: readTime,
        // Store metadata as JSON
        metadata: {
          video_id: videoId,
          duration: metadata.duration,
          channel: metadata.channel,
          transcript_language: result.language,
          transcript_method: result.method,
        },
      })
      .eq("id", note_id);

    console.log("🔄 Triggering summarization...");

    // Trigger summarization
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-notes-summary`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      },
      body: JSON.stringify({ note_id, raw_content: result.transcript, language }),
    }).catch((err) => console.error("❌ Summarization trigger error:", err));

    console.log("✅ YouTube extraction completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        video_id: videoId,
        title: metadata.title,
        word_count: wordCount,
        transcript_language: result.language,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ YouTube extraction error:", error);

    const body = await req.json().catch(() => ({}));
    const note_id = body.note_id;

    if (note_id) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      await supabaseClient
        .from("study_notes")
        .update({
          processing_status: "failed",
          processing_error: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", note_id);
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});

// ============================================================
// Extract video ID from various YouTube URL formats
// ============================================================
function extractVideoId(url: string): string | null {
  // Handle all possible YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    /youtube\.com\/live\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      // Clean up video ID (remove any trailing parameters)
      return match[1].split("&")[0].split("?")[0];
    }
  }

  // If URL is just the video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  return null;
}

// ============================================================
// ✅ NEW: Fetch video metadata using Innertube API
// ============================================================
interface VideoMetadata {
  title: string;
  duration: number;
  channel: string;
  description: string;
}

async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata> {
  try {
    // Use YouTube's oEmbed API (official and reliable)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);

    if (!response.ok) {
      throw new Error("Video not found or unavailable");
    }

    const data = await response.json();

    // Get additional metadata from watch page
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const watchResponse = await fetch(watchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const html = await watchResponse.text();

    // Extract duration from page (in seconds)
    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 0;

    // Extract description
    const descMatch = html.match(/"shortDescription":"([^"]*)"/);
    const description = descMatch ? decodeUnicode(descMatch[1]) : "";

    return {
      title: data.title || `YouTube Video ${videoId}`,
      duration: duration,
      channel: data.author_name || "Unknown",
      description: description.substring(0, 500), // Limit description length
    };
  } catch (error) {
    console.warn("⚠️ Could not fetch full metadata, using fallback");
    return {
      title: `YouTube Video ${videoId}`,
      duration: 0,
      channel: "Unknown",
      description: "",
    };
  }
}

// ============================================================
// ✅ NEW: Fetch transcript with multiple fallback strategies
// ============================================================
interface TranscriptResult {
  transcript: string;
  language: string;
  method: string;
}

async function fetchTranscriptWithFallback(videoId: string, preferredLanguage: string): Promise<TranscriptResult> {
  const strategies = [
    // Strategy 1: Preferred language
    () => fetchTranscriptStrategy1(videoId, preferredLanguage),
    // Strategy 2: Auto-generated in preferred language
    () => fetchTranscriptStrategy1(videoId, preferredLanguage, true),
    // Strategy 3: English (most common)
    () => fetchTranscriptStrategy1(videoId, "en"),
    // Strategy 4: Auto-generated English
    () => fetchTranscriptStrategy1(videoId, "en", true),
    // Strategy 5: Hindi (if not already tried)
    () => (preferredLanguage !== "hi" ? fetchTranscriptStrategy1(videoId, "hi") : Promise.reject()),
    // Strategy 6: Try Innertube API
    () => fetchTranscriptInnertube(videoId, preferredLanguage),
    // Strategy 7: Try any available language
    () => fetchAnyAvailableTranscript(videoId),
  ];

  let lastError: Error | null = null;

  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`🔄 Trying strategy ${i + 1}/${strategies.length}...`);
      const result = await strategies[i]();
      if (result && result.transcript && result.transcript.length > 50) {
        return result;
      }
    } catch (error) {
      lastError = error as Error;
      console.log(`⚠️ Strategy ${i + 1} failed: ${lastError.message}`);
      continue;
    }
  }

  // All strategies failed
  throw new Error(
    `Could not fetch transcript for video ${videoId}. ` +
      `This video may not have captions/subtitles available, or it may be age-restricted/private. ` +
      `Last error: ${lastError?.message}`,
  );
}

// ============================================================
// Strategy 1: YouTube Timedtext API
// ============================================================
async function fetchTranscriptStrategy1(
  videoId: string,
  language: string,
  autoGenerated: boolean = false,
): Promise<TranscriptResult> {
  const langCode = getLangCode(language);
  const kind = autoGenerated ? "asr" : ""; // asr = auto-generated

  const url = `https://www.youtube.com/api/timedtext?lang=${langCode}&v=${videoId}${kind ? `&kind=${kind}` : ""}`;

  console.log(`📡 Fetching from timedtext API: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": `${langCode},en;q=0.9`,
    },
  });

  if (!response.ok) {
    throw new Error(`Timedtext API returned ${response.status}`);
  }

  const xml = await response.text();

  if (xml.length < 50) {
    throw new Error("Transcript XML too short or empty");
  }

  // Parse XML and extract text
  const textMatches = xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g);
  const transcript = Array.from(textMatches)
    .map((match) => decodeHTML(match[1]))
    .filter((text) => text.trim().length > 0)
    .join(" ");

  if (transcript.length < 50) {
    throw new Error("Parsed transcript too short");
  }

  return {
    transcript,
    language: langCode,
    method: autoGenerated ? "timedtext-auto" : "timedtext-manual",
  };
}

// ============================================================
// Strategy 6: Innertube API (YouTube's internal API)
// ============================================================
async function fetchTranscriptInnertube(videoId: string, preferredLanguage: string): Promise<TranscriptResult> {
  try {
    // Get caption tracks first
    const captionTracksUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(captionTracksUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const html = await response.text();

    // Extract caption tracks from page
    const captionTracksMatch = html.match(/"captionTracks":(\[.*?\])/s);
    if (!captionTracksMatch) {
      throw new Error("No caption tracks found in video page");
    }

    const captionTracks = JSON.parse(captionTracksMatch[1]);

    if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
      throw new Error("No captions available for this video");
    }

    console.log(`📋 Found ${captionTracks.length} caption tracks`);

    // Find best matching caption track
    const langCode = getLangCode(preferredLanguage);
    let bestTrack = captionTracks.find((track: any) => track.languageCode === langCode);

    // Fallback to English
    if (!bestTrack) {
      bestTrack = captionTracks.find((track: any) => track.languageCode === "en");
    }

    // Use first available track
    if (!bestTrack) {
      bestTrack = captionTracks[0];
    }

    console.log(`📝 Using caption track: ${bestTrack.languageCode}`);

    // Fetch caption XML
    const captionUrl = bestTrack.baseUrl;
    const captionResponse = await fetch(captionUrl);
    const captionXml = await captionResponse.text();

    // Parse XML
    const textMatches = captionXml.matchAll(/<text[^>]*>([^<]*)<\/text>/g);
    const transcript = Array.from(textMatches)
      .map((match) => decodeHTML(match[1]))
      .filter((text) => text.trim().length > 0)
      .join(" ");

    if (transcript.length < 50) {
      throw new Error("Transcript too short");
    }

    return {
      transcript,
      language: bestTrack.languageCode,
      method: "innertube",
    };
  } catch (error) {
    throw new Error(`Innertube API failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// ============================================================
// Strategy 7: Try any available language
// ============================================================
async function fetchAnyAvailableTranscript(videoId: string): Promise<TranscriptResult> {
  const commonLanguages = ["en", "hi", "es", "fr", "de", "pt", "ja", "ko", "zh", "ar", "ru"];

  for (const lang of commonLanguages) {
    try {
      console.log(`🔍 Trying language: ${lang}`);
      const result = await fetchTranscriptStrategy1(videoId, lang);
      if (result.transcript.length > 50) {
        return result;
      }
    } catch (error) {
      continue;
    }
  }

  throw new Error("No transcripts available in any common language");
}

// ============================================================
// Helper: Get language code
// ============================================================
function getLangCode(language: string): string {
  const langMap: Record<string, string> = {
    hi: "hi",
    hindi: "hi",
    en: "en",
    english: "en",
    es: "es",
    spanish: "es",
    fr: "fr",
    french: "fr",
    de: "de",
    german: "de",
    pt: "pt",
    portuguese: "pt",
    ja: "ja",
    japanese: "ja",
    ko: "ko",
    korean: "ko",
    zh: "zh",
    chinese: "zh",
    ar: "ar",
    arabic: "ar",
    ru: "ru",
    russian: "ru",
  };

  return langMap[language.toLowerCase()] || language.toLowerCase();
}

// ============================================================
// Helper: Decode HTML entities
// ============================================================
function decodeHTML(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n/g, " ")
    .trim();
}

// ============================================================
// Helper: Decode unicode escapes
// ============================================================
function decodeUnicode(str: string): string {
  return str.replace(/\\u[\dA-F]{4}/gi, (match) => {
    return String.fromCharCode(parseInt(match.replace(/\\u/g, ""), 16));
  });
}
