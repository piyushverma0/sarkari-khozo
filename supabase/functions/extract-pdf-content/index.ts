// Extract PDF Content - Use Claude PDF support to extract text
// Uses Claude Sonnet 4.5 with native PDF reading capability

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractRequest {
  note_id: string;
  source_url: string;
  source_type: string;
  language: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { note_id, source_url, language }: ExtractRequest = await req.json();

    if (!note_id || !source_url) {
      return new Response(JSON.stringify({ error: "note_id and source_url are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Starting PDF extraction for note:", note_id);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_status: "extracting",
        processing_progress: 20,
      })
      .eq("id", note_id);

    // Step 1: Download PDF from Supabase Storage
    console.log("Extracting PDF content from", source_url);

    let pdfBuffer: ArrayBuffer;

    // Parse the storage path from the URL
    // URL format: https://{supabase-url}/storage/v1/object/public/{bucket}/{path}
    const urlParts = source_url.split("/storage/v1/object/public/");
    if (urlParts.length === 2) {
      const [bucket, ...pathParts] = urlParts[1].split("/");
      const filePath = pathParts.join("/");

      console.log("Downloading from storage bucket:", bucket, "path:", filePath);

      // Use Supabase client to download (handles auth automatically)
      const { data, error } = await supabase.storage.from(bucket).download(filePath);

      if (error) {
        console.error("Storage download error:", error);
        throw new Error(`Failed to download PDF from storage: ${error.message}`);
      }

      pdfBuffer = await data.arrayBuffer();
    } else {
      // Fallback to direct fetch for external URLs
      console.log("Downloading from external URL");
      const pdfResponse = await fetch(source_url);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
      }
      pdfBuffer = await pdfResponse.arrayBuffer();
    }

    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
    console.log("PDF downloaded, size:", pdfBuffer.byteLength, "bytes");

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 40,
      })
      .eq("id", note_id);

    // Step 2: Use Claude Sonnet 4.5 to extract and understand PDF content
    console.log("Sending PDF to Claude Sonnet 4.5 for extraction...");

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
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
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                type: "text",
                text: `You are an expert study-material analyzer and a highly accurate document-extraction model. Your task is to extract ALL content from the given PDF exactly and completely, without skipping or summarizing anything.

EXTRACTION REQUIREMENTS

1. Complete Extraction

Extract every word, every line, every page, and every section from the PDF.

No summarization, rewriting, paraphrasing, or shortening.

Your output must reflect the document as-is, only structured neatly.




2. Preserve Original Structure

Maintain all headings, sub-headings, sections, and hierarchical relationships.

Reconstruct the document flow faithfully and in original order.

If the source uses unclear formatting, intelligently infer structure without altering content.




3. Include Every Detail
Extract ALL of the following exactly as written:

Tables (convert into markdown tables with all rows/columns preserved)

Bullet and numbered lists

Paragraphs and notes

Important dates and deadlines

Figures, statistics, and numerical data

URLs, email IDs, and phone numbers

Contact details and official addresses

Technical formulas, equations, and symbols

Footnotes, references, and citations

Page numbers (if present)

Disclaimers & instructions



4. Government Exam–Specific Extraction Priority
Identify and fully extract these (if present):

Eligibility criteria (age limits, educational qualifications)

Important dates (application start/end, exam date, correction window)

Application fees & payment modes

Vacancies (full breakdown category-wise/post-wise)

Selection process

Exam pattern & marking scheme

Detailed syllabus

Documents required

Application procedure (step-by-step)

Pay scale, grade pay, allowances

Exam centers / state-wise distribution

Reservation details



5. Formatting Guidelines (Do NOT modify these rules)

Use markdown headings:

# for main sections

## for subsections

### for sub-levels

Use bold for critical details, dates, deadlines, and important terms.

Use markdown tables for structured data.

Preserve bullet points and numbering exactly.

Keep content clean, readable, and structured for studying.

STRICT RULES

Do NOT summarize.

Do NOT rewrite or paraphrase.

Do NOT skip ANY content.

Do NOT merge or compress information.

Do NOT add external content or hallucinate.

If something is unreadable, mark it as: _unreadable text here_.

OUTPUT FORMAT

Produce a complete, fully extracted document in markdown.

Begin with:
# Extracted Document

Then proceed page by page or section by section.

Ensure formatting is clean, consistent, and structured for study notes.`,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Claude API error:", errorText);
      throw new Error(`Claude API error: ${errorText}`);
    }

    const anthropicData = await anthropicResponse.json();
    console.log("Claude extraction complete");

    // Extract text from response
    let extractedText = "";
    if (anthropicData.content && anthropicData.content.length > 0) {
      for (const block of anthropicData.content) {
        if (block.type === "text") {
          extractedText += block.text + "\n";
        }
      }
    }

    if (!extractedText.trim()) {
      throw new Error("No text could be extracted from PDF");
    }

    console.log("Extracted text length:", extractedText.length, "characters");

    // Calculate word count
    const wordCount = extractedText.split(/\s+/).filter((w) => w.length > 0).length;
    const estimatedReadTime = Math.ceil(wordCount / 200); // 200 words per minute

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 50,
      })
      .eq("id", note_id);

    // Step 3: Store extracted text in database
    const { error: updateError } = await supabase
      .from("study_notes")
      .update({
        extracted_text: extractedText,
        word_count: wordCount,
        estimated_read_time: estimatedReadTime,
        processing_progress: 55,
      })
      .eq("id", note_id);

    if (updateError) {
      console.error("Failed to update note with extracted text:", updateError);
      throw updateError;
    }

    console.log("Extracted text stored in database");

    // Step 4: Trigger summarization
    try {
      fetch(`${SUPABASE_URL}/functions/v1/generate-notes-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          note_id,
          raw_content: extractedText,
          language,
        }),
      }).catch((err) => {
        console.error("Failed to trigger summarization:", err);
        // Update note status to failed
        supabase
          .from("study_notes")
          .update({
            processing_status: "failed",
            processing_error: "Failed to start summarization process",
          })
          .eq("id", note_id);
      });

      console.log("Summarization triggered for note:", note_id);
    } catch (triggerError) {
      console.error("Failed to trigger summarization:", triggerError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        note_id,
        extracted_length: extractedText.length,
        word_count: wordCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("PDF extraction error:", error);

    // Try to extract note_id from the request
    let noteId: string | null = null;
    try {
      const body = await req.clone().json();
      noteId = body.note_id;
    } catch {
      // Ignore parsing errors
    }

    // Update note status to failed if we have the note_id
    if (noteId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase
        .from("study_notes")
        .update({
          processing_status: "failed",
          processing_error: error.message || "PDF extraction failed",
        })
        .eq("id", noteId);
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
