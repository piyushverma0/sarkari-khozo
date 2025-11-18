import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
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
    console.log(`[${new Date().toISOString()}] Query: is_active=true, order by published_date desc, limit 10`);
    
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
    
    // Log each story's details for debugging
    if (stories && stories.length > 0) {
      console.log(`[${new Date().toISOString()}] 📋 Stories being used in bulletin:`);
      stories.forEach((s, i) => {
        const publishedDate = s.published_date ? new Date(s.published_date).toISOString() : 'No date';
        console.log(`  ${i + 1}. [${publishedDate}] ${s.headline.substring(0, 60)}...`);
      });
    }

    // Step 2: Generate ONE cohesive Hindi bulletin script using Claude
    console.log(`[${new Date().toISOString()}] 🤖 Generating Hindi bulletin script with Claude...`);
    
    // Prepare stories text for Claude
    const storiesText = stories.map((story, i) => 
      `${i + 1}. ${story.headline}\n   ${story.summary}`
    ).join('\n\n');

    const systemPrompt = `आप गायत्री हैं, एक अनुभवी हिंदी समाचार रिपोर्टर जो प्रतिष्ठित भारतीय न्यूज़ चैनल पर लाखों दर्शकों को खबरें सुनाती हैं।
आपकी आवाज़ आत्मविश्वास से भरी, स्पष्ट, और पेशेवर है।
आप महत्वपूर्ण खबरों पर जोर देती हैं, लेकिन सकारात्मक खबरों में उत्साह दिखाती हैं।
आप दर्शकों से सीधा संवाद करती हैं और जटिल विषयों को सरल बनाती हैं।`;

    const userPrompt = `इन ${stories.length} खबरों का एक विस्तृत हिंदी समाचार बुलेटिन बनाएं।

खबरें:
${storiesText}

निर्देश:
- एक प्राकृतिक, प्रवाहपूर्ण समाचार बुलेटिन बनाएं जैसे एक पेशेवर भारतीय महिला समाचार रिपोर्टर बोलती है
- शुरुआत में ऊर्जावान अभिवादन दें: "नमस्कार! मैं गायत्री हूं। आज की बड़ी खबरें।"
- हर खबर को 15-20 शब्दों में विस्तार से बताएं (सिर्फ हेडलाइन नहीं, महत्वपूर्ण विवरण भी)
- महत्वपूर्ण खबरों में थोड़ा जोर और गंभीरता रखें
- खबरों को प्राकृतिक रूप से जोड़ें (जैसे "इसके अलावा", "और", "साथ ही", "अगली खबर में")
- हर खबर को पूरी तरह कवर करें, कोई भी छोड़ें नहीं
- अंत में शांत और दोस्ताना लहजे में कहें: "यह थीं आज की मुख्य खबरें। अधिक जानकारी के लिए नीचे स्क्रॉल करें।"
- पूरा बुलेटिन 400-500 शब्दों में रखें ताकि सभी ${stories.length} खबरें कवर हो जाएं
- केवल हिंदी स्क्रिप्ट दें, कोई अतिरिक्त टिप्पणी नहीं
- स्क्रिप्ट में स्वाभाविक रुकावट और प्रवाह बनाए रखें`;

    const response = await callClaude({
      systemPrompt,
      userPrompt,
      maxTokens: 1000,
    });

    const fullScript = response.content.trim();
    
    // Enhance script with voice-related tags for better expression
    let enhancedScript = fullScript;

    // Add excited tone for opening
    enhancedScript = enhancedScript.replace(
      /नमस्कार!/g, 
      "[excited]नमस्कार![/excited]"
    );

    // Add emphasis on key phrases
    enhancedScript = enhancedScript.replace(
      /(महत्वपूर्ण|बड़ी खबर|ध्यान दें|विशेष)/g,
      "[curious]$1[/curious]"
    );

    // Add natural pauses after each story transition
    enhancedScript = enhancedScript.replace(
      /(इसके अलावा|और|साथ ही|अगली खबर में)/g,
      "$1..."
    );

    // Add softer tone for closing
    enhancedScript = enhancedScript.replace(
      /(यह थीं आज की मुख्य खबरें)/g,
      "[whispers]$1[/whispers]"
    );

    console.log(`[${new Date().toISOString()}] ✨ Script enhanced with voice tags`);
    
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
          text: enhancedScript,
          model_id: "eleven_v3",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.85,
            style: 0.4,
            use_speaker_boost: true,
            speaking_rate: 0.92,
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

    // Step 5: Calculate duration based on word count
    // Average Hindi speaking: ~150 words per minute at 0.92x speed
    const wordCount = fullScript.split(/\s+/).length;
    const wordsPerMinute = 150 * 0.92;
    const estimatedDuration = Math.round((wordCount / wordsPerMinute) * 60);
    
    console.log(`[${new Date().toISOString()}] 📊 Script stats: ${wordCount} words, estimated ${estimatedDuration}s`);

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