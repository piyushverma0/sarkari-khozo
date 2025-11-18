// Extract YouTube Transcript V2 - Enhanced with YouTube Data API V3 + Claude Sonnet 4.5
// Uses youtube-transcript package + Claude for comprehensive study notes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { YoutubeTranscript } from "https://esm.sh/youtube-transcript@1.0.6";

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

// Primary method: Fetch transcript using youtube-transcript package
async function fetchTranscriptWithPackage(
  videoId: string,
  languageCode: string = "en",
): Promise<{ text: string; timestampedText: string; timestamps: Array<{ time: string; text: string }> }> {
  console.log(`🔍 [TRANSCRIPT] Starting transcript extraction for video: ${videoId}`);
  console.log(`🔍 [TRANSCRIPT] User preferred language: ${languageCode}`);

  try {
    // Try to fetch transcript with language preference
    const langCodes =
      languageCode === "hi" || languageCode === "hindi"
        ? ["hi", "hi-IN", "en", "en-US"]
        : ["en", "en-US", languageCode, "hi", "hi-IN"];

    let transcriptData: any[] = [];
    let usedLang = "";

    for (const lang of langCodes) {
      try {
        console.log(`🔍 [TRANSCRIPT] Attempting language: ${lang}`);
        transcriptData = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: lang,
        });

        if (transcriptData && transcriptData.length > 0) {
          usedLang = lang;
          console.log(`✅ [TRANSCRIPT] Success! Found transcript in language: ${lang}`);
          break;
        }
      } catch (err) {
        console.log(`⚠️ [TRANSCRIPT] Language ${lang} not available, trying next...`);
        continue;
      }
    }

    // If no language worked, try without language specification
    if (transcriptData.length === 0) {
      console.log(`🔍 [TRANSCRIPT] Attempting to fetch default transcript...`);
      transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
      usedLang = "auto";
    }

    if (!transcriptData || transcriptData.length === 0) {
      throw new Error("No transcript data available");
    }

    // Process the transcript data
    const timestamps: Array<{ time: string; text: string }> = [];
    const textParts: string[] = [];
    const timestampedParts: string[] = [];

    for (const entry of transcriptData) {
      const text = entry.text.trim();
      if (text) {
        textParts.push(text);

        // Format timestamp as MM:SS or HH:MM:SS
        const seconds = Math.floor(entry.offset / 1000);
        const timeStr = formatTimestamp(seconds);
        timestamps.push({ time: timeStr, text });
        timestampedParts.push(`[${timeStr}] ${text}`);
      }
    }

    const fullText = textParts.join(" ");
    const timestampedText = timestampedParts.join("\n");

    console.log(`✅ [TRANSCRIPT] Successfully extracted transcript`);
    console.log(`✅ [TRANSCRIPT] Language: ${usedLang}`);
    console.log(`✅ [TRANSCRIPT] Length: ${fullText.length} characters`);
    console.log(`✅ [TRANSCRIPT] Segments: ${timestamps.length}`);
    console.log(`✅ [TRANSCRIPT] Preview: ${fullText.substring(0, 200)}`);

    return {
      text: fullText,
      timestampedText,
      timestamps,
    };
  } catch (error) {
    console.error(`❌ [TRANSCRIPT] Extraction failed:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Helper: Format seconds to timestamp string
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
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

// Ultimate fallback: Use Claude to create notes from available metadata
async function fetchTranscriptWithClaudeFallback(videoUrl: string, metadata: VideoMetadata | null): Promise<string> {
  console.log("🌐 [CLAUDE_FALLBACK] Using Claude to generate content from available metadata...");
  console.log("🌐 [CLAUDE_FALLBACK] Video URL:", videoUrl);

  try {
    // If we have metadata with description, use that to create meaningful content
    if (metadata && metadata.description && metadata.description.length > 200) {
      console.log("🌐 [CLAUDE_FALLBACK] Using video metadata and description");

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
              content: `I have a YouTube video that doesn't have accessible captions. Please help me create comprehensive study notes based on the available information.

Video Title: ${metadata.title}
Channel: ${metadata.channelTitle}
Duration: ${metadata.duration}
Published: ${metadata.publishedAt}
Views: ${metadata.viewCount}

Description:
${metadata.description}

${metadata.chapters && metadata.chapters.length > 0 ? `\nVideo Chapters:\n${metadata.chapters.map((c) => `${c.time}: ${c.title}`).join("\n")}` : ""}

${metadata.tags && metadata.tags.length > 0 ? `\nTags: ${metadata.tags.join(", ")}` : ""}

Based on the title, description, and chapter information, please create detailed study notes. Explain what this video is likely about, the main topics it covers, and key concepts that students should understand. Make it educational and comprehensive.

Return a detailed explanation of what this video covers (at least 500 words).`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${error}`);
      }

      const result = await response.json();
      const content = result.content && result.content[0] && result.content[0].text ? result.content[0].text : "";

      console.log(`🌐 [CLAUDE_FALLBACK] Generated content from metadata, length: ${content.length}`);

      if (content && content.length > 200) {
        console.log("✅ [CLAUDE_FALLBACK] Successfully generated content from metadata");
        return content;
      }
    }

    throw new Error("Insufficient metadata to generate content");
  } catch (error) {
    console.error(
      "❌ [CLAUDE_FALLBACK] Failed to generate content:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

// Process transcript with Claude for comprehensive structured study notes
async function processTranscriptWithClaude(
  transcript: string,
  timestampedTranscript: string,
  timestamps: Array<{ time: string; text: string }>,
  metadata: VideoMetadata | null,
  videoUrl: string,
  language: string,
): Promise<{
  summary: string;
  keyPoints: string[];
  topics: string[];
  structuredContent: any;
}> {
  console.log("📝 Processing transcript with Claude Sonnet 4.5 for comprehensive study notes...");

  try {
    // Build time-stamped index from timestamps
    const timeIndex = buildTimeIndex(timestamps, metadata);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 16000,
        messages: [
          {
            role: "user",
            content: `Transform this YouTube video transcript into comprehensive study notes for Indian students preparing for exams.

VIDEO METADATA:
Title: ${metadata?.title || "YouTube Video"}
Video Link: ${videoUrl}
Duration: ${metadata?.duration || "N/A"}
Channel: ${metadata?.channelTitle || "Unknown"}
Description: ${metadata?.description?.substring(0, 500) || "N/A"}
${metadata?.chapters && metadata.chapters.length > 0 ? `\nVideo Chapters:\n${metadata.chapters.map((c) => `- [${c.time}] ${c.title}`).join("\n")}` : ""}

TRANSCRIPT WITH TIMESTAMPS:
${timestampedTranscript.substring(0, 40000)}${timestampedTranscript.length > 40000 ? "\n...(transcript continues)" : ""}

CREATE COMPREHENSIVE STRUCTURED NOTES WITH:

1. **Executive Summary** (3-4 paragraphs)
   - Main topic and purpose (include video title with link: [${metadata?.title}](${videoUrl}))
   - Key takeaways
   - Target audience and learning level

2. **Learning Objectives**
   - What students will learn from this content
   - Skills and knowledge developed
   - Expected outcomes

3. **Detailed Content Sections** (based on content flow and chapters)
   Format each section as:
   ## Section Title

   ### 🔑 Key Concepts
   - Concept explanations with **bold** for important terms

   ### 📌 Important Points
   - Detailed bullet points
   - Use ⚡ for key points, 💡 for tips, ⚠️ for warnings

   ### 💼 Examples/Applications
   - Real-world applications
   - Practical use cases

   ---

4. **Key Terms Glossary**
   - Important technical terms with clear definitions
   - Format: **Term**: Definition

5. **Quick Review Questions**
   - 5-10 self-assessment questions with answers
   - Focus on key concepts and practical application

6. **Additional Resources & Related Topics**
   - Topics to explore further
   - Recommended study areas

7. **Time-Stamped Content Index**
${timeIndex}

FORMAT REQUIREMENTS:
✓ Use Markdown formatting throughout
✓ Include code blocks (triple backticks) for technical content
✓ Create tables for comparisons when relevant
✓ Add emoji markers: ⚡ Key Point, 💡 Tip, ⚠️ Warning, 📌 Important, 🔑 Concept
✓ Keep paragraphs concise (3-4 sentences max)
✓ Use **bold** for important terms
✓ Include numbered lists for sequential processes
✓ Add horizontal rules (---) between major sections
✓ Link back to video with timestamps where relevant: [Watch at MM:SS](${videoUrl}&t=XXXs)

OUTPUT AS VALID JSON (NO MARKDOWN OUTSIDE JSON):
{
  "summary": "Executive summary with [video title](link) in first paragraph...",
  "keyPoints": ["⚡ Point 1 with emoji", "📌 Point 2", ...],
  "topics": ["topic1", "topic2", "topic3", ...],
  "structuredContent": {
    "sections": [
      {
        "title": "Learning Objectives",
        "content": "## Learning Objectives\\n\\n- Objective 1\\n- Objective 2\\n...",
        "timestamp": "00:00"
      },
      {
        "title": "Section Name",
        "content": "## Section Name\\n\\n### 🔑 Key Concepts\\n\\nMarkdown formatted content...\\n\\n### 📌 Important Points\\n\\n- Point 1\\n- Point 2\\n\\n---",
        "timestamp": "02:30"
      },
      {
        "title": "Key Terms Glossary",
        "content": "## 📚 Key Terms Glossary\\n\\n**Term 1**: Definition\\n**Term 2**: Definition\\n..."
      },
      {
        "title": "Review Questions",
        "content": "## ✅ Review Questions\\n\\n1. **Question 1**\\n   - Answer\\n\\n2. **Question 2**\\n   - Answer\\n..."
      },
      {
        "title": "Additional Resources",
        "content": "## 📖 Additional Resources\\n\\n- Resource 1\\n- Resource 2\\n..."
      },
      {
        "title": "Time-Stamped Index",
        "content": "${timeIndex.replace(/\n/g, "\\n")}"
      }
    ]
  }
}

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown blocks, no backticks around JSON
2. Escape all quotes and newlines properly in JSON strings
3. structuredContent MUST have "sections" array
4. Each section MUST have "title" and "content"
5. Include video link in summary first paragraph
6. Add emojis to key points for visual appeal
7. Include all 6 required sections (Learning Objectives, Content, Glossary, Questions, Resources, Index)
8. Language: ${language === "hi" ? "Hindi" : language === "en" ? "English" : language}
9. Make it comprehensive - this should be exam-ready study material

Return the JSON now:`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const result = await response.json();
    let responseText = result.content && result.content[0] && result.content[0].text ? result.content[0].text : "{}";

    // Clean up response - remove markdown code blocks if present
    responseText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    console.log(`📝 Claude response length: ${responseText.length} characters`);
    console.log(`📝 Response preview: ${responseText.substring(0, 200)}...`);

    try {
      const parsed = JSON.parse(responseText);

      // Validate and fix structure if needed
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
              content:
                typeof parsed.structuredContent === "string"
                  ? parsed.structuredContent
                  : responseText.substring(0, 10000),
            },
          ],
        };
      }

      // Ensure all required fields exist
      const finalResult = {
        summary:
          parsed.summary ||
          `Study notes for: ${metadata?.title || "YouTube Video"}\n\n${transcript.substring(0, 500)}...`,
        keyPoints:
          Array.isArray(parsed.keyPoints) && parsed.keyPoints.length > 0
            ? parsed.keyPoints
            : ["⚡ Review the video content for key insights"],
        topics: Array.isArray(parsed.topics) && parsed.topics.length > 0 ? parsed.topics : extractTopics(metadata),
        structuredContent: parsed.structuredContent,
      };

      console.log("✅ Successfully parsed Claude response");
      console.log(`✅ Sections: ${finalResult.structuredContent.sections.length}`);
      console.log(`✅ Key points: ${finalResult.keyPoints.length}`);
      console.log(`✅ Topics: ${finalResult.topics.length}`);

      return finalResult;
    } catch (parseError) {
      console.error(
        "❌ Claude response was not valid JSON:",
        parseError instanceof Error ? parseError.message : String(parseError),
      );
      console.log("📄 Raw response:", responseText.substring(0, 500));

      // Create comprehensive fallback structure
      return createFallbackStructure(transcript, timestampedTranscript, metadata, videoUrl);
    }
  } catch (error) {
    console.error("❌ Claude processing failed:", error instanceof Error ? error.message : String(error));
    return createFallbackStructure(transcript, timestampedTranscript, metadata, videoUrl);
  }
}

// Helper: Build time-stamped index from timestamps
function buildTimeIndex(timestamps: Array<{ time: string; text: string }>, metadata: VideoMetadata | null): string {
  const index: string[] = ["## 🕐 Time-Stamped Content Index\n"];

  // Add chapters if available
  if (metadata?.chapters && metadata.chapters.length > 0) {
    index.push("### Video Chapters\n");
    for (const chapter of metadata.chapters) {
      index.push(`- [${chapter.time}] ${chapter.title}`);
    }
    index.push("\n### Content Timeline\n");
  }

  // Sample timestamps at intervals (every 30 seconds or significant points)
  const sampleInterval = Math.max(1, Math.floor(timestamps.length / 20)); // Max 20 entries
  for (let i = 0; i < timestamps.length; i += sampleInterval) {
    const entry = timestamps[i];
    const preview = entry.text.substring(0, 60);
    index.push(`- [${entry.time}] ${preview}${entry.text.length > 60 ? "..." : ""}`);
  }

  return index.join("\n");
}

// Helper: Extract topics from metadata
function extractTopics(metadata: VideoMetadata | null): string[] {
  const topics: string[] = [];

  if (metadata?.tags && metadata.tags.length > 0) {
    topics.push(...metadata.tags.slice(0, 10));
  }

  if (metadata?.categoryId) {
    topics.push(`Category ${metadata.categoryId}`);
  }

  if (topics.length === 0) {
    topics.push("Educational Content", "Study Material");
  }

  return topics;
}

// Helper: Create fallback structure when JSON parsing fails
function createFallbackStructure(
  transcript: string,
  timestampedTranscript: string,
  metadata: VideoMetadata | null,
  videoUrl: string,
): {
  summary: string;
  keyPoints: string[];
  topics: string[];
  structuredContent: any;
} {
  console.log("📝 Creating fallback structure...");

  const summary = `# ${metadata?.title || "YouTube Video Study Notes"}

[Watch Video](${videoUrl})

This content covers the key concepts presented in the video "${metadata?.title}". The transcript has been extracted and is available for study.

Channel: ${metadata?.channelTitle || "Unknown"}
Duration: ${metadata?.duration || "N/A"}

${transcript.substring(0, 500)}...`;

  return {
    summary,
    keyPoints: [
      "⚡ Review the full transcript below",
      "📌 Watch the video for complete understanding",
      "💡 Take notes on key concepts mentioned",
    ],
    topics: extractTopics(metadata),
    structuredContent: {
      sections: [
        {
          title: "Video Information",
          content: `## Video Information\n\n**Title**: ${metadata?.title || "YouTube Video"}\n\n**Link**: [Watch Video](${videoUrl})\n\n**Channel**: ${metadata?.channelTitle || "Unknown"}\n\n**Duration**: ${metadata?.duration || "N/A"}`,
        },
        {
          title: "Full Transcript",
          content: `## 📝 Full Transcript\n\n${timestampedTranscript.substring(0, 15000)}${timestampedTranscript.length > 15000 ? "\n\n...(transcript continues)" : ""}`,
        },
        {
          title: "Study Tips",
          content: `## 💡 Study Tips\n\n- Watch the video alongside these notes\n- Pause and take your own notes at key moments\n- Review the time-stamped transcript to find specific topics\n- Practice explaining concepts in your own words`,
        },
      ],
    },
  };
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

    // Step 3: Fetch transcript using youtube-transcript package
    console.log(`📥 [EXTRACTION] Starting transcript extraction for video: ${videoId}`);
    let transcript: string;
    let timestampedTranscript: string;
    let timestamps: Array<{ time: string; text: string }>;
    let extractionMethod: string;
    let confidenceScore = 1.0; // High confidence for package extraction

    try {
      // Method 1: Use youtube-transcript package (most reliable)
      console.log(`📥 [EXTRACTION] Attempting Method 1: youtube-transcript package`);
      const transcriptData = await fetchTranscriptWithPackage(videoId, language);
      transcript = transcriptData.text;
      timestampedTranscript = transcriptData.timestampedText;
      timestamps = transcriptData.timestamps;
      extractionMethod = "youtube-transcript-package";
      console.log(`✅ [EXTRACTION] Method 1 succeeded: youtube-transcript package`);
    } catch (packageError) {
      console.log(
        "⚠️ [EXTRACTION] Method 1 failed - youtube-transcript package:",
        packageError instanceof Error ? packageError.message : String(packageError),
      );

      try {
        // Method 2: Fallback - Generate content from metadata
        console.log(`📥 [EXTRACTION] Attempting Method 2: Claude with metadata`);
        transcript = await fetchTranscriptWithClaudeFallback(youtubeUrl, metadata);
        timestampedTranscript = transcript; // No timestamps available
        timestamps = [];
        extractionMethod = "claude_metadata";
        confidenceScore = 0.5; // Lower confidence for metadata-based generation
        console.log(`✅ [EXTRACTION] Method 2 succeeded: Generated content from metadata`);
      } catch (claudeError) {
        console.error("❌ [EXTRACTION] All extraction methods failed");
        console.error("Package error:", packageError instanceof Error ? packageError.message : String(packageError));
        console.error("Claude error:", claudeError instanceof Error ? claudeError.message : String(claudeError));

        // Better error message based on what we tried
        const errorMessage = `Could not extract captions from this video. The video may not have captions available in Hindi or English, or the captions may be disabled. Please try a different video with enabled captions.`;

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

    // Validate transcript before processing
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

    console.log(`✅ [EXTRACTION] Transcript successfully extracted and validated`);
    console.log(`✅ [EXTRACTION] Method: ${extractionMethod}`);
    console.log(`✅ [EXTRACTION] Confidence: ${(confidenceScore * 100).toFixed(0)}%`);
    console.log(`✅ [EXTRACTION] Transcript length: ${transcript.length} characters`);
    console.log(`✅ [EXTRACTION] Timestamps: ${timestamps.length} segments`);

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

    const processed = await processTranscriptWithClaude(
      transcript,
      timestampedTranscript,
      timestamps,
      metadata,
      youtubeUrl,
      language,
    );

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
        confidence_score: confidenceScore,
        metadata: metadata
          ? {
              title: metadata.title,
              channel: metadata.channelTitle,
              duration: metadata.duration,
              views: metadata.viewCount,
              chapters: metadata.chapters?.length || 0,
            }
          : { title: videoTitle },
        transcript_stats: {
          length: transcript.length,
          word_count: wordCount,
          estimated_read_time: estimatedReadTime,
          timestamp_segments: timestamps.length,
          has_timestamps: timestamps.length > 0,
        },
        content_stats: {
          key_points_count: processed.keyPoints.length,
          topics_count: processed.topics.length,
          sections_count: processed.structuredContent?.sections?.length || 0,
        },
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
