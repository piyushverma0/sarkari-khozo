import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// HYBRID VERSION: YouTube Data API v3 + Free Methods Fallback
// ============================================================
// STRATEGY:
// 1. PRIMARY: Use YouTube Data API v3 (official, reliable)
// 2. FALLBACK: Use free methods (7 strategies) if API fails
// 3. Best of both worlds: Official reliability + Free backup
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

    // ✅ STEP 2: Fetch transcript (HYBRID: API first, then free methods)
    console.log(`📝 Fetching transcript (preferred language: ${language})...`);
    const result = await fetchTranscriptHybrid(videoId, language);

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
        method_used: result.method,
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
      return match[1].split("&")[0].split("?")[0];
    }
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  return null;
}

// ============================================================
// Fetch video metadata using oEmbed API
// ============================================================
interface VideoMetadata {
  title: string;
  duration: number;
  channel: string;
  description: string;
}

async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);

    if (!response.ok) {
      throw new Error("Video not found or unavailable");
    }

    const data = await response.json();

    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const watchResponse = await fetch(watchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const html = await watchResponse.text();

    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 0;

    const descMatch = html.match(/"shortDescription":"([^"]*)"/);
    const description = descMatch ? decodeUnicode(descMatch[1]) : "";

    return {
      title: data.title || `YouTube Video ${videoId}`,
      duration: duration,
      channel: data.author_name || "Unknown",
      description: description.substring(0, 500),
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
// ✅ HYBRID: Try YouTube Data API v3 first, then free methods
// ============================================================
interface TranscriptResult {
  transcript: string;
  language: string;
  method: string;
}

async function fetchTranscriptHybrid(videoId: string, preferredLanguage: string): Promise<TranscriptResult> {
  const apiKey = Deno.env.get("YOUTUBE_API_KEY");

  // ✅ PRIMARY METHOD: YouTube Data API v3 (Official)
  if (apiKey && apiKey.trim().length > 0) {
    try {
      console.log("🔑 PRIMARY: Trying YouTube Data API v3 (official)...");
      const result = await fetchTranscriptWithYouTubeAPI(videoId, preferredLanguage, apiKey);
      console.log("✅ SUCCESS: YouTube Data API v3 worked!");
      return result;
    } catch (apiError) {
      console.warn("⚠️ YouTube Data API v3 failed, falling back to free methods");
      console.warn(`   Reason: ${apiError instanceof Error ? apiError.message : "Unknown"}`);
      // Continue to fallback methods below
    }
  } else {
    console.log("ℹ️ No YOUTUBE_API_KEY found, using free methods only");
  }

  // 🔄 FALLBACK METHOD: Free methods (7 strategies)
  console.log("🔄 FALLBACK: Using free extraction methods...");
  return await fetchTranscriptWithFallback(videoId, preferredLanguage);
}

// ============================================================
// PRIMARY: YouTube Data API v3 implementation
// ============================================================
async function fetchTranscriptWithYouTubeAPI(
  videoId: string,
  preferredLanguage: string,
  apiKey: string,
): Promise<TranscriptResult> {
  // Step 1: Verify video exists and get basic info
  const videoUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`;
  const videoResponse = await fetch(videoUrl);

  if (!videoResponse.ok) {
    const errorData = await videoResponse.json().catch(() => ({}));
    throw new Error(`YouTube API error ${videoResponse.status}: ${errorData.error?.message || "Unknown error"}`);
  }

  const videoData = await videoResponse.json();

  if (!videoData.items || videoData.items.length === 0) {
    throw new Error("Video not found via YouTube API");
  }

  console.log(`   ✓ Video verified: ${videoData.items[0].snippet.title}`);

  // Step 2: Get available caption tracks
  const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&key=${apiKey}&part=snippet`;
  const captionsResponse = await fetch(captionsUrl);

  if (!captionsResponse.ok) {
    throw new Error("No captions available for this video");
  }

  const captionsData = await captionsResponse.json();

  if (!captionsData.items || captionsData.items.length === 0) {
    throw new Error("No caption tracks found");
  }

  console.log(`   ✓ Found ${captionsData.items.length} caption tracks`);

  // Step 3: Find best caption track
  const langCode = getLangCode(preferredLanguage);

  // Try exact match first
  let bestCaption = captionsData.items.find((cap: any) => cap.snippet.language === langCode);

  // Try English if preferred not found
  if (!bestCaption && langCode !== "en") {
    bestCaption = captionsData.items.find((cap: any) => cap.snippet.language === "en");
  }

  // Use first available
  if (!bestCaption) {
    bestCaption = captionsData.items[0];
  }

  const captionLanguage = bestCaption.snippet.language;
  const captionName = bestCaption.snippet.name || "auto-generated";
  console.log(`   ✓ Selected caption: ${captionLanguage} (${captionName})`);

  // Step 4: Download caption content
  // Note: YouTube Data API v3 requires OAuth 2.0 to download captions directly
  // We'll use the timedtext API with the confirmed caption language
  // This hybrid approach: API confirms captions exist + free method downloads

  const timedtextUrl = `https://www.youtube.com/api/timedtext?lang=${captionLanguage}&v=${videoId}`;
  const transcriptResponse = await fetch(timedtextUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!transcriptResponse.ok) {
    throw new Error(`Failed to download caption (timedtext returned ${transcriptResponse.status})`);
  }

  const xml = await transcriptResponse.text();

  if (xml.length < 50) {
    throw new Error("Caption XML too short or empty");
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

  console.log(`   ✓ Downloaded ${transcript.length} characters`);

  return {
    transcript,
    language: captionLanguage,
    method: "youtube-data-api-v3",
  };
}

// ============================================================
// FALLBACK: Free methods with 7 strategies
// ============================================================
async function fetchTranscriptWithFallback(videoId: string, preferredLanguage: string): Promise<TranscriptResult> {
  const strategies = [
    () => fetchTranscriptStrategy1(videoId, preferredLanguage),
    () => fetchTranscriptStrategy1(videoId, preferredLanguage, true),
    () => fetchTranscriptStrategy1(videoId, "en"),
    () => fetchTranscriptStrategy1(videoId, "en", true),
    () => (preferredLanguage !== "hi" ? fetchTranscriptStrategy1(videoId, "hi") : Promise.reject()),
    () => fetchTranscriptInnertube(videoId, preferredLanguage),
    () => fetchAnyAvailableTranscript(videoId),
  ];

  let lastError: Error | null = null;

  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`   🔄 Trying fallback strategy ${i + 1}/${strategies.length}...`);
      const result = await strategies[i]();
      if (result && result.transcript && result.transcript.length > 50) {
        console.log(`   ✅ Strategy ${i + 1} succeeded!`);
        return result;
      }
    } catch (error) {
      lastError = error as Error;
      console.log(`   ⚠️ Strategy ${i + 1} failed: ${lastError.message}`);
      continue;
    }
  }

  throw new Error(
    `Could not fetch transcript for video ${videoId}. ` +
      `This video may not have captions available. ` +
      `Last error: ${lastError?.message}`,
  );
}

// ============================================================
// Strategy 1: Timedtext API
// ============================================================
async function fetchTranscriptStrategy1(
  videoId: string,
  language: string,
  autoGenerated: boolean = false,
): Promise<TranscriptResult> {
  const langCode = getLangCode(language);
  const kind = autoGenerated ? "asr" : "";

  const url = `https://www.youtube.com/api/timedtext?lang=${langCode}&v=${videoId}${kind ? `&kind=${kind}` : ""}`;

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
    throw new Error("Transcript XML too short");
  }

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
// Strategy 6: Innertube API
// ============================================================
async function fetchTranscriptInnertube(videoId: string, preferredLanguage: string): Promise<TranscriptResult> {
  const captionTracksUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(captionTracksUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  const html = await response.text();

  const captionTracksMatch = html.match(/"captionTracks":(\[.*?\])/s);
  if (!captionTracksMatch) {
    throw new Error("No caption tracks found");
  }

  const captionTracks = JSON.parse(captionTracksMatch[1]);

  if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
    throw new Error("No captions available");
  }

  const langCode = getLangCode(preferredLanguage);
  let bestTrack = captionTracks.find((track: any) => track.languageCode === langCode);

  if (!bestTrack) {
    bestTrack = captionTracks.find((track: any) => track.languageCode === "en");
  }

  if (!bestTrack) {
    bestTrack = captionTracks[0];
  }

  const captionUrl = bestTrack.baseUrl;
  const captionResponse = await fetch(captionUrl);
  const captionXml = await captionResponse.text();

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
}

// ============================================================
// Strategy 7: Try any available language
// ============================================================
async function fetchAnyAvailableTranscript(videoId: string): Promise<TranscriptResult> {
  const commonLanguages = ["en", "hi", "es", "fr", "de", "pt", "ja", "ko"];

  for (const lang of commonLanguages) {
    try {
      const result = await fetchTranscriptStrategy1(videoId, lang);
      if (result.transcript.length > 50) {
        return result;
      }
    } catch (error) {
      continue;
    }
  }

  throw new Error("No transcripts available in any language");
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
