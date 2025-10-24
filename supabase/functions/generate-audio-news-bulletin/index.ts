import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callClaude } from "../_shared/claude-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`[${new Date().toISOString()}] 🎙️ Starting audio news bulletin generation`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!elevenLabsKey) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Fetch top 10 most recent active stories (any category)
    console.log(`[${new Date().toISOString()}] 📰 Fetching recent stories...`);
    
    const { data: stories, error: storiesError } = await supabase
      .from("discovery_stories")
      .select("*")
      .eq("is_active", true)
      .order("published_date", { ascending: false })
      .limit(10);

    if (storiesError) {
      console.error(`[${new Date().toISOString()}] ✗ Database error:`, storiesError);
      throw storiesError;
    }

    if (stories.length === 0) {
      console.log(`[${new Date().toISOString()}] ⚠️ No recent stories found`);
      return new Response(
        JSON.stringify({ error: "No recent stories available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    console.log(`[${new Date().toISOString()}] ✅ Found ${stories.length} stories to process`);

    // Step 2: Generate ONE cohesive Hindi bulletin script using Claude
    console.log(`[${new Date().toISOString()}] 🤖 Generating Hindi bulletin script with Claude...`);
    
    // Prepare stories text for Claude
    const storiesText = stories.map((story, i) => 
      `${i + 1}. ${story.headline}\n   ${story.summary}`
    ).join('\n\n');

    const systemPrompt = `आप गायत्री हैं, एक हिंदी समाचार रिपोर्टर जो लाखों लोगों को खबरें सुनाती हैं।
आपकी आवाज़ दोस्ताना, स्पष्ट, और आत्मविश्वास से भरी है।
आप समाचारों को रोचक और प्रवाहपूर्ण तरीके से प्रस्तुत करती हैं।`;

    const userPrompt = `इन ${stories.length} खबरों का एक 60-90 सेकंड का हिंदी समाचार बुलेटिन बनाएं।

खबरें:
${storiesText}

निर्देश:
- एक प्राकृतिक, प्रवाहपूर्ण समाचार बुलेटिन बनाएं
- शुरुआत में संक्षिप्त अभिवादन दें: "नमस्कार! मैं गायत्री हूं। आज की बड़ी खबरें।"
- हर खबर को 8-10 शब्दों में संक्षेप में बताएं
- खबरों को प्राकृतिक रूप से जोड़ें (जैसे "इसके अलावा", "और", "साथ ही")
- अंत में कहें: "यह थीं आज की मुख्य खबरें। अधिक जानकारी के लिए नीचे स्क्रॉल करें।"
- पूरा बुलेटिन 200-250 शब्दों में रखें
- केवल हिंदी स्क्रिप्ट दें, कोई अतिरिक्त टिप्पणी नहीं`;

    const response = await callClaude({
      systemPrompt,
      userPrompt,
      maxTokens: 500,
    });

    const fullScript = response.content.trim();
    
    // Create scripts array for database storage (one entry per story)
    const scripts = stories.map((story, i) => ({
      story_id: story.id,
      order: i + 1,
      script: `${story.headline} - ${story.summary}`.substring(0, 200), // Store simplified version
    }));

    console.log(`[${new Date().toISOString()}] 📊 Full script length: ${fullScript.length} characters`);

    // Step 4: Generate audio with ElevenLabs
    console.log(`[${new Date().toISOString()}] 🎵 Generating audio with ElevenLabs...`);
    
    const voiceId = "kcQkGnn0HAT2JRDQ4Ljp"; // Norah/Gayatri voice
    const audioResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": elevenLabsKey,
        },
        body: JSON.stringify({
          text: fullScript,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
            style: 0.3,
            use_speaker_boost: true,
            speaking_rate: 1.1,
          },
          language_code: "hi",
        }),
      }
    );

    if (!audioResponse.ok) {
      const errorText = await audioResponse.text();
      console.error(`[${new Date().toISOString()}] ✗ ElevenLabs error:`, errorText);
      throw new Error(`ElevenLabs API error: ${errorText}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    
    // Convert audio buffer to base64 in chunks to avoid stack overflow
    const uint8Array = new Uint8Array(audioBuffer);
    const chunkSize = 8192; // Process 8KB at a time
    let binaryString = '';

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }

    const audioBase64 = btoa(binaryString);
    
    console.log(`[${new Date().toISOString()}] ✅ Audio generated (${audioBuffer.byteLength} bytes)`);

    // Step 5: Calculate duration (rough estimate: 1 character ≈ 0.05 seconds at 1.1x speed)
    const estimatedDuration = Math.round((fullScript.length * 0.05) / 1.1);

    // Step 6: Save to database
    console.log(`[${new Date().toISOString()}] 💾 Saving bulletin to database...`);
    
    const currentDate = new Date();
    const expiresAt = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const hindiDate = currentDate.toLocaleDateString("hi-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Insert bulletin
    const bulletinTitle = "आज की खबरें - " + hindiDate;
    const { data: bulletin, error: bulletinError } = await supabase
      .from("audio_news_bulletins")
      .insert({
        title: bulletinTitle,
        duration_seconds: estimatedDuration,
        audio_base64: audioBase64,
        story_ids: stories.map((s) => s.id),
        language: "hi",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (bulletinError) {
      console.error(`[${new Date().toISOString()}] ✗ Database error:`, bulletinError);
      throw bulletinError;
    }

    console.log(`[${new Date().toISOString()}] ✅ Bulletin saved with ID: ${bulletin.id}`);

    // Insert scripts
    const scriptInserts = scripts.map((s) => ({
      bulletin_id: bulletin.id,
      story_id: s.story_id,
      story_order: s.order,
      hindi_script: s.script,
    }));

    const { error: scriptsError } = await supabase
      .from("audio_news_scripts")
      .insert(scriptInserts);

    if (scriptsError) {
      console.error(`[${new Date().toISOString()}] ⚠️ Scripts insert error:`, scriptsError);
    } else {
      console.log(`[${new Date().toISOString()}] ✅ All scripts saved`);
    }

    console.log(`[${new Date().toISOString()}] 🎉 Bulletin generation complete!`);

    return new Response(
      JSON.stringify({
        success: true,
        bulletin_id: bulletin.id,
        title: bulletin.title,
        duration: estimatedDuration,
        stories_count: stories.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error in generate-audio-news-bulletin:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});