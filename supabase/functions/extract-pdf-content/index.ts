// Extract PDF Content - Uses AI with file upload
// Uses Sonar Pro (primary) with GPT-4-turbo fallback for PDF processing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { callAIWithFile, logAIUsage } from "../_shared/ai-client.ts";

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

    console.log("PDF downloaded, size:", pdfBuffer.byteLength, "bytes");

    // Check file size (Gemini supports files up to 50MB)
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    if (pdfBuffer.byteLength > maxSizeBytes) {
      throw new Error(
        `PDF file is too large (${(pdfBuffer.byteLength / 1024 / 1024).toFixed(2)}MB). Maximum supported size is 50MB.`,
      );
    }

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 40,
      })
      .eq("id", note_id);

    // Step 2: Use Gemini 2.0 Flash to extract and understand PDF content
    console.log("Sending PDF to AI (Sonar Pro → GPT-4-turbo) for extraction...");

    const systemPrompt = `You are an expert study material analyzer. Extract ALL content from this PDF document comprehensively.

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

CRITICAL: Do NOT summarize or skip content. Extract EVERYTHING from the document in a well-structured, readable format that students can study from.`;

    const userPrompt = "Extract all content from this PDF document following the requirements above.";

    const aiResponse = await callAIWithFile({
      systemPrompt,
      userPrompt,
      fileBuffer: pdfBuffer,
      mimeType: "application/pdf",
      displayName: `pdf_${note_id}.pdf`,
      temperature: 0.2,
      maxTokens: 16000,
    });

    logAIUsage("extract-pdf-content", aiResponse.tokensUsed, aiResponse.webSearchUsed, aiResponse.modelUsed);

    console.log("AI extraction complete with", aiResponse.modelUsed);

    const extractedText = aiResponse.content;

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
      console.log("Triggering summarization for note:", note_id);

      const summaryResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-notes-summary`, {
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
      });

      if (!summaryResponse.ok) {
        const errorText = await summaryResponse.text();
        console.error("Summarization error:", errorText);
        throw new Error(`Summarization failed: ${errorText}`);
      }

      const summaryData = await summaryResponse.json();
      console.log("Summarization completed:", summaryData);
    } catch (summaryError: unknown) {
      console.error("Failed to trigger summarization:", summaryError);
      const errorMessage = summaryError instanceof Error ? summaryError.message : String(summaryError);
      // Update note with error
      await supabase
        .from("study_notes")
        .update({
          processing_status: "failed",
          processing_error: `Summarization failed: ${errorMessage}`,
        })
        .eq("id", note_id);

      throw summaryError;
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
  } catch (error: unknown) {
    console.error("Error in extract-pdf-content:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Update note status to failed
    try {
      const bodyText = await req.text();
      const body = JSON.parse(bodyText);
      if (body.note_id) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        await supabase
          .from("study_notes")
          .update({
            processing_status: "failed",
            processing_error: errorMessage || "PDF extraction failed",
          })
          .eq("id", body.note_id);
      }
    } catch (e) {
      console.error("Failed to update error status:", e);
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
