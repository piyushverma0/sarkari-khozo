// Process Study Material - Upload and initiate processing
// Handles: PDF, DOCX, YouTube URLs, Web URLs, Google Drive links

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessRequest {
  source_type: "pdf" | "docx" | "youtube" | "url" | "google_drive";
  source_url?: string;
  file_data?: string; // Base64 encoded file
  file_name?: string;
  language: string;
  user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { source_type, source_url, file_data, file_name, language, user_id }: ProcessRequest = await req.json();

    if (!source_type || !user_id) {
      return new Response(JSON.stringify({ error: "source_type and user_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Processing study material:", { source_type, file_name, language, user_id });

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Upload file to storage if file_data provided
    let storageUrl = source_url;
    if (file_data && file_name) {
      try {
        // Convert base64 to binary
        const binaryData = Uint8Array.from(atob(file_data), (c) => c.charCodeAt(0));

        // Upload to Supabase Storage
        const storagePath = `${user_id}/${Date.now()}_${file_name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("study-materials")
          .upload(storagePath, binaryData, {
            contentType:
              source_type === "pdf"
                ? "application/pdf"
                : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            upsert: false,
          });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("study-materials").getPublicUrl(storagePath);

        storageUrl = publicUrl;
        console.log("File uploaded to:", storageUrl);
      } catch (uploadErr) {
        console.error("File upload failed:", uploadErr);
        return new Response(JSON.stringify({ error: "File upload failed", details: uploadErr instanceof Error ? uploadErr.message : String(uploadErr) }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!storageUrl) {
      return new Response(JSON.stringify({ error: "Either source_url or file_data must be provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Generate title from filename or URL
    const generatedTitle = file_name
      ? file_name.replace(/\.[^/.]+$/, "") // Remove extension
      : storageUrl.split("/").pop()?.substring(0, 50) || "Untitled Note";

    // Step 3: Create database record with pending status
    const { data: note, error: noteError } = await supabase
      .from("study_notes")
      .insert({
        user_id,
        title: generatedTitle,
        source_type,
        source_url: storageUrl,
        original_language: language,
        current_language: language,
        processing_status: "pending",
        processing_progress: 5,
        has_flashcards: false,
        has_quiz: false,
        has_translation: false,
        is_favorite: false,
      })
      .select()
      .single();

    if (noteError) {
      console.error("Database insert error:", noteError);
      return new Response(JSON.stringify({ error: "Failed to create note record", details: noteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Note record created:", note.id);

    // Step 4: Trigger async extraction based on source type
    try {
      const extractionFunctionName =
        source_type === "pdf"
          ? "extract-pdf-content"
          : source_type === "docx"
            ? "extract-docx-content"
            : source_type === "youtube"
              ? "extract-youtube-transcript-v2" // Use enhanced v2 function
              : "extract-web-content";

      // Update status to extracting
      await supabase
        .from("study_notes")
        .update({
          processing_status: "extracting",
          processing_progress: 10,
        })
        .eq("id", note.id);

      // Trigger extraction function (fire and forget)
      fetch(`${SUPABASE_URL}/functions/v1/${extractionFunctionName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          note_id: note.id,
          source_url: storageUrl,
          source_type,
          language,
        }),
      }).catch((err) => {
        console.error("Failed to trigger extraction:", err);
        // Update note status to failed
        supabase
          .from("study_notes")
          .update({
            processing_status: "failed",
            processing_error: "Failed to start extraction process",
          })
          .eq("id", note.id);
      });

      console.log("Extraction triggered for note:", note.id);
    } catch (triggerError) {
      console.error("Failed to trigger extraction:", triggerError);
      // Don't fail the entire request, just log the error
    }

    // Step 5: Return note immediately
    return new Response(JSON.stringify({ note }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in process-study-material:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
