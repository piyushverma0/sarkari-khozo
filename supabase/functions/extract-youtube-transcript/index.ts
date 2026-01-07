import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// FIXED VERSION: Enhanced logging and better error handling
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

    // ✅ ENHANCED: Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("📦 Request body received:", JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError);
      throw new Error("Invalid request body. Expected JSON.");
    }

    const { note_id, source_url, language } = requestBody;

    // ✅ ENHANCED: Validate required fields
    if (!note_id) {
      throw new Error("Missing required field: note_id");
    }

    if (!source_url) {
      throw new Error("Missing required field: source_url");
    }

    console.log(`🎬 Starting YouTube extraction for note ${note_id}`);
    console.log(`🔗 Source URL: "${source_url}"`);
    console.log(`🌍 Language: ${language || "not specified"}`);

    // Update status
    await supabaseClient
      .from("study_notes")
      .update({ processing_status: "extracting", processing_progress: 10 })
      .eq("id", note_id);

    // ✅ ENHANCED: Extract video ID with better error handling
    const videoId = extractVideoId(source_url);

    if (!videoId) {
      // Log the exact URL that failed
      console.error(`❌ Failed to extract video ID from URL: "${source_url}"`);
      console.error(`📊 URL type: ${typeof source_url}`);
      console.error(`📏 URL length: ${source_url?.length || 0}`);

      throw new Error(
        `Invalid YouTube URL format: "${source_url}". ` +
          `Please provide a valid YouTube link like: ` +
          `https://www.youtube.com/watch?v=VIDEO_ID or ` +
          `https://youtu.be/VIDEO_ID`,
      );
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

    // ✅ STEP 2: Fetch transcript (HYBRID)
    console.log(`📝 Fetching transcript (preferred language: ${language || "en"})...`);
    const result = await fetchTranscriptHybrid(videoId, language || "en");

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
      body: JSON.stringify({ note_id, raw_content: result.transcript, language: language || "en" }),
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

    // ✅ ENHANCED: Better error handling
    let errorMessage = "Unknown error";
    let errorDetails = "";

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || "";
    } else {
      errorMessage = String(error);
    }

    console.error("📋 Error message:", errorMessage);
    console.error("📋 Error details:", errorDetails);

    // Try to get note_id from request
    let note_id: string | undefined;
    try {
      const body = await req.json().catch(() => ({}));
      note_id = body.note_id;
    } catch (e) {
      console.error("Could not parse request for note_id");
    }

    if (note_id) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      await supabaseClient
        .from("study_notes")
        .update({
          processing_status: "failed",
          processing_error: errorMessage,
        })
        .eq("id", note_id);
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});

// ============================================================
// ✅ ENHANCED: Extract video ID with better pattern matching
// ============================================================
function extractVideoId(url: string): string | null {
  // Handle null/undefined
  if (!url) {
    console.error("❌ URL is null or undefined");
    return null;
  }

  // Convert to string and trim
  const urlString = String(url).trim();

  if (urlString.length === 0) {
    console.error("❌ URL is empty string");
    return null;
  }

  console.log(`🔍 Attempting to extract video ID from: "${urlString}"`);

  // ✅ ENHANCED: More comprehensive patterns
  const patterns = [
    // Standard watch URLs
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})(?:[&?#]|$)/,
    // Shortened youtu.be URLs
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?#]|$)/,
    // Embed URLs
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:[&?#]|$)/,
    // /v/ URLs
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})(?:[&?#]|$)/,
    // Shorts URLs
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(?:[&?#]|$)/,
    // Live URLs
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})(?:[&?#]|$)/,
    // Watch URLs with additional parameters (more flexible)
    /[?&]v=([a-zA-Z0-9_-]{11})(?:[&]|$)/,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = urlString.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      console.log(`✅ Video ID extracted using pattern ${i + 1}: ${videoId}`);
      return videoId;
    }
  }

  // Check if URL is just the video ID (11 characters, alphanumeric + _ -)
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlString)) {
    console.log(`✅ URL appears to be a direct video ID: ${urlString}`);
    return urlString;
  }

  console.error(`❌ No pattern matched for URL: "${urlString}"`);
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
// HYBRID: Try YouTube Data API v3 first, then free methods
// ============================================================
interface TranscriptResult {
  transcript: string;
  language: string;
  method: string;
}

async function fetchTranscriptHybrid(videoId: string, preferredLanguage: string): Promise<TranscriptResult> {
  const apiKey = Deno.env.get("YOUTUBE_API_KEY");

  // PRIMARY METHOD: YouTube Data API v3
  if (apiKey && apiKey.trim().length > 0) {
    try {
      console.log("🔑 PRIMARY: Trying YouTube Data API v3 (official)...");
      const result = await fetchTranscriptWithYouTubeAPI(videoId, preferredLanguage, apiKey);
      console.log("✅ SUCCESS: YouTube Data API v3 worked!");
      return result;
    } catch (apiError) {
      console.warn("⚠️ YouTube Data API v3 failed, falling back to free methods");
      console.warn(`   Reason: ${apiError instanceof Error ? apiError.message : "Unknown"}`);
    }
  } else {
    console.log("ℹ️ No YOUTUBE_API_KEY found, using free methods only");
  }

  // FALLBACK METHOD: Free methods
  console.log("🔄 FALLBACK: Using free extraction methods...");
  return await fetchTranscriptWithFallback(videoId, preferredLanguage);
}

// ============================================================
// PRIMARY: YouTube Data API v3
// ============================================================
async function fetchTranscriptWithYouTubeAPI(
  videoId: string,
  preferredLanguage: string,
  apiKey: string,
): Promise<TranscriptResult> {
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

  const langCode = getLangCode(preferredLanguage);

  let bestCaption = captionsData.items.find((cap: any) => cap.snippet.language === langCode);

  if (!bestCaption && langCode !== "en") {
    bestCaption = captionsData.items.find((cap: any) => cap.snippet.language === "en");
  }

  if (!bestCaption) {
    bestCaption = captionsData.items[0];
  }

  const captionLanguage = bestCaption.snippet.language;
  const captionName = bestCaption.snippet.name || "auto-generated";
  console.log(`   ✓ Selected caption: ${captionLanguage} (${captionName})`);

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
// FALLBACK: Free methods
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

function decodeUnicode(str: string): string {
  return str.replace(/\\u[\dA-F]{4}/gi, (match) => {
    return String.fromCharCode(parseInt(match.replace(/\\u/g, ""), 16));
  });
}
