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

  console.log(`[${new Date().toISOString()}] 🎙️ Starting Bhojpuri audio news bulletin generation`);

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

    // Step 2: Generate ONE cohesive Bhojpuri bulletin script using Claude
    console.log(`[${new Date().toISOString()}] 🤖 Generating Bhojpuri bulletin script with Claude...`);
    
    // Prepare stories text for Claude
    const storiesText = stories.map((story, i) => 
      `${i + 1}. ${story.headline}\n   ${story.summary}`
    ).join('\n\n');

    const systemPrompt = `आप गायत्री हैं, एक अनुभवी भोजपुरी समाचार रिपोर्टर जो प्रतिष्ठित न्यूज़ चैनल पर लाखों दर्शकों को खबरें सुनावत हईं।
आपकी आवाज़ आत्मविश्वास से भरल, स्पष्ट, और पेशेवर बा।
आप महत्वपूर्ण खबरन पर जोर देवत हईं, लेकिन सकारात्मक खबरन में उत्साह देखावत हईं।
आप दर्शकन से सीधा संवाद करत हईं और जटिल विषयन के सरल बनावत हईं।`;

    const userPrompt = `इ ${stories.length} खबरन के एगो विस्तृत भोजपुरी समाचार बुलेटिन बनाईं।

खबरें:
${storiesText}

निर्देश:
- एगो प्राकृतिक, प्रवाहपूर्ण समाचार बुलेटिन बनाईं जइसे कि एगो पेशेवर भोजपुरी महिला समाचार रिपोर्टर बोलत हईं
- शुरुआत में ऊर्जावान अभिवादन दीं: "प्रणाम! हम गायत्री हईं। आज के बड़ खबरन के बारे में जानीं।"
- हर खबर के 15-20 शब्दन में विस्तार से बताईं (बस हेडलाइन ना, महत्वपूर्ण विवरण भी)
- महत्वपूर्ण खबरन में थोड़ जोर आ गंभीरता रखीं
- खबरन के प्राकृतिक रूप से जोड़ीं (जइसे "एकरे अलावा", "आ", "साथ में", "अगला खबर में")
- हर खबर के पूरा तरह से कवर करीं, कौनो भी ना छोड़ीं
- अंत में शांत आ दोस्ताना लहजे में कहीं: "ई रहलीं आज के मुख्य खबरन। अधिका जानकारी खातिर नीचे स्क्रॉल करीं।"
- पूरा बुलेटिन 400-500 शब्दन में रखीं ताकि सभ ${stories.length} खबरन कवर हो जाव
- केवल भोजपुरी स्क्रिप्ट दीं, कौनो अतिरिक्त टिप्पणी ना
- स्क्रिप्ट में स्वाभाविक रुकावट आ प्रवाह बनाए रखीं`;

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
      /प्रणाम!/g, 
      "[excited]प्रणाम![/excited]"
    );

    // Add emphasis on key phrases
    enhancedScript = enhancedScript.replace(
      /(महत्वपूर्ण|बड़ खबर|ध्यान दीं|विशेष)/g,
      "[curious]$1[/curious]"
    );

    // Add natural pauses after each story transition
    enhancedScript = enhancedScript.replace(
      /(एकरे अलावा|आ|साथ में|अगला खबर में)/g,
      "$1..."
    );

    // Add softer tone for closing
    enhancedScript = enhancedScript.replace(
      /(ई रहलीं आज के मुख्य खबरन)/g,
      "[whispers]$1[/whispers]"
    );

    console.log(`[${new Date().toISOString()}] ✨ Script enhanced with voice tags`);
    
    // Create scripts array for database storage (one entry per story)
    const scripts = stories.map((story, i) => ({
      story_id: story.id,
      order: i + 1,
      script: `${story.headline} - ${story.summary}`.substring(0, 200),
    }));

    console.log(`[${new Date().toISOString()}] 📊 Full script length: ${fullScript.length} characters`);

    // Step 3: Generate audio with ElevenLabs
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
            speaking_rate: 0.88,
          },
          language_code: "hi", // Use Hindi as closest to Bhojpuri
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
    const chunkSize = 8192;
    let binaryString = '';

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }

    const audioBase64 = btoa(binaryString);
    
    console.log(`[${new Date().toISOString()}] ✅ Audio generated (${audioBuffer.byteLength} bytes)`);

    // Step 4: Calculate duration based on word count
    const wordCount = fullScript.split(/\s+/).length;
    const wordsPerMinute = 150 * 0.88;
    const estimatedDuration = Math.round((wordCount / wordsPerMinute) * 60);
    
    console.log(`[${new Date().toISOString()}] 📊 Script stats: ${wordCount} words, estimated ${estimatedDuration}s`);

    // Step 5: Save to database
    console.log(`[${new Date().toISOString()}] 💾 Saving Bhojpuri bulletin to database...`);
    
    const currentDate = new Date();
    const expiresAt = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);

    const hindiDate = currentDate.toLocaleDateString("hi-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Insert bulletin
    const bulletinTitle = "आज के खबरन - " + hindiDate;
    const { data: bulletin, error: bulletinError } = await supabase
      .from("audio_news_bulletins")
      .insert({
        title: bulletinTitle,
        duration_seconds: estimatedDuration,
        audio_base64: audioBase64,
        story_ids: stories.map((s) => s.id),
        language: "bh",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (bulletinError) {
      console.error(`[${new Date().toISOString()}] ✗ Database error:`, bulletinError);
      throw bulletinError;
    }

    console.log(`[${new Date().toISOString()}] ✅ Bhojpuri bulletin saved with ID: ${bulletin.id}`);

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

    console.log(`[${new Date().toISOString()}] 🎉 Bhojpuri bulletin generation complete!`);

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
    console.error(`[${new Date().toISOString()}] ❌ Error in generate-audio-news-bulletin-bhojpuri:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
