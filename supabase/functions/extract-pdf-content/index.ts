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

// Convert ArrayBuffer to base64 in chunks to avoid stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192; // Process 8KB at a time
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

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

    console.log("PDF downloaded, size:", pdfBuffer.byteLength, "bytes");

    // Check file size (Claude supports PDFs up to 32MB)
    const maxSizeBytes = 32 * 1024 * 1024; // 32MB
    if (pdfBuffer.byteLength > maxSizeBytes) {
      throw new Error(
        `PDF file is too large (${(pdfBuffer.byteLength / 1024 / 1024).toFixed(2)}MB). Maximum supported size is 32MB.`,
      );
    }

    console.log("Converting PDF to base64...");
    const pdfBase64 = arrayBufferToBase64(pdfBuffer);
    console.log("Base64 conversion complete");

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
                text: `You are an expert study material analyzer. Extract ALL content from this PDF document comprehensively.

EXTRACTION REQUIREMENTS:
1. **Complete Extraction**: Extract every single word, sentence, and piece of information
2. **Preserve Structure**: Maintain headings, sections, subsections, and hierarchical organization
3. **Include All Details**:
   - Tables and their complete data
   - Lists (numbered and bulleted)
   - Important dates and deadlines
   - Numbers, statistics, and figures
   - URLs, email addresses, and contact information
   - Formulas, equations, or technical content
   - References and citations

4. **Special Attention for Government Exam Materials**:
   - Eligibility criteria (age, qualifications, experience)
   - Important dates (application start/end, exam dates)
   - Application fees and payment details
   - Vacancy details and post information
   - Selection process and exam pattern
   - Syllabus and subjects
   - How to apply (step-by-step process)
   - Documents required
   - Pay scale and allowances
   - Exam centers and locations

5. **Formatting Guidelines**:
   - Use markdown headings (# ## ###) for section hierarchy
   - Use **bold** for important terms, numbers, dates, and deadlines
   - Use *italic* for emphasis or definitions
   - Use \`code\` for specific codes, application numbers, reference IDs
   - Use ==highlights== for critical deadlines and urgent information
   - Use tables for structured data when applicable
   - Preserve bullet points and numbered lists
   - Keep content clean and well-organized
   - **NO paragraph should exceed 4 lines (~320 characters)** - break longer paragraphs into shorter ones or convert to bullet points

6. **Paragraph Length Rule**:
   - Maximum 4 lines per paragraph
   - If content is longer, either:
     a) Break into multiple short paragraphs with blank lines between them
     b) Convert to bullet points for better readability
   - Example: Instead of "The fee is Rs. 500 for general category and Rs. 250 for SC/ST/OBC which is payable online and candidates must keep the receipt", write:
     "**Application Fee:**\\n- General: **Rs. 500**\\n- SC/ST/OBC: **Rs. 250**\\n\\nPayable online. ==Keep payment receipt.=="

CRITICAL: Do NOT summarize or skip content. Extract EVERYTHING from the document in a well-structured, readable format that students can study from.`,
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

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 50,
      })
      .eq("id", note_id);

    // Step 3: Trigger summarization (extracted text is passed directly, not stored in DB)
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
