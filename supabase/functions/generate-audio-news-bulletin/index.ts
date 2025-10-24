import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
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

    // Step 1: Fetch top 10 stories from last 48 hours
    console.log(`[${new Date().toISOString()}] 📰 Fetching recent stories...`);
    
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

    // Fetch stories by category to ensure proper mix
    const { data: examsData } = await supabase
      .from("discovery_stories")
      .select("*")
      .eq("is_active", true)
      .eq("category", "exams")
      .gte("published_date", twoDaysAgo.toISOString())
      .order("published_date", { ascending: false })
      .limit(4);

    const { data: jobsData } = await supabase
      .from("discovery_stories")
      .select("*")
      .eq("is_active", true)
      .eq("category", "jobs")
      .gte("published_date", twoDaysAgo.toISOString())
      .order("published_date", { ascending: false })
      .limit(3);

    const { data: schemesData } = await supabase
      .from("discovery_stories")
      .select("*")
      .eq("is_active", true)
      .eq("category", "schemes")
      .gte("published_date", twoDaysAgo.toISOString())
      .order("published_date", { ascending: false })
      .limit(2);

    const { data: policiesData } = await supabase
      .from("discovery_stories")
      .select("*")
      .eq("is_active", true)
      .eq("category", "policies")
      .gte("published_date", twoDaysAgo.toISOString())
      .order("published_date", { ascending: false })
      .limit(1);

    // Combine stories
    const stories = [
      ...(examsData || []),
      ...(jobsData || []),
      ...(schemesData || []),
      ...(policiesData || [])
    ].slice(0, 10);

    if (stories.length === 0) {
      console.log(`[${new Date().toISOString()}] ⚠️ No recent stories found`);
      return new Response(
        JSON.stringify({ error: "No recent stories available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    console.log(`[${new Date().toISOString()}] ✅ Found ${stories.length} stories`);

    // Step 2: Generate Hindi scripts using Claude
    console.log(`[${new Date().toISOString()}] 🤖 Generating Hindi scripts with Claude...`);
    
    const systemPrompt = `आप गायत्री हैं, एक हिंदी समाचार रिपोर्टर जो लाखों लोगों को खबरें सुनाती हैं।
आपकी आवाज़ दोस्ताना, स्पष्ट, और आत्मविश्वास से भरी है।
आप हर खबर को रोचक और महत्वपूर्ण बनाती हैं।`;

    const scripts: Array<{ story_id: string; order: number; script: string }> = [];

    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      const userPrompt = `इस खबर का 6 सेकंड का हिंदी समाचार सारांश बनाएं।

निर्देश:
- केवल सबसे महत्वपूर्ण जानकारी शामिल करें
- एक रिपोर्टर की तरह बोलें
- तारीखें और संख्याएं स्पष्ट रूप से बताएं
- 15-20 शब्दों में सीमित रखें

खबर: ${story.headline}
विवरण: ${story.summary}`;

      try {
        const response = await callClaude({
          systemPrompt,
          userPrompt,
          model: "claude-sonnet-4-5",
          maxTokens: 150,
        });

        scripts.push({
          story_id: story.id,
          order: i + 1,
          script: response.content.trim(),
        });

        console.log(`[${new Date().toISOString()}] ✓ Generated script ${i + 1}/10`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ✗ Error generating script ${i + 1}:`, error);
        throw error;
      }
    }

    // Step 3: Compile complete bulletin script
    console.log(`[${new Date().toISOString()}] 📝 Compiling bulletin script...`);
    
    const opening = "नमस्कार! मैं गायत्री हूं। आज की 10 बड़ी खबरें एक मिनट में।";
    const closing = "यह थीं आज की मुख्य खबरें। अधिक जानकारी के लिए नीचे स्क्रॉल करें।";
    
    const fullScript = [
      opening,
      ...scripts.map((s) => s.script),
      closing,
    ].join(" ");

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
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    
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
    const { data: bulletin, error: bulletinError } = await supabase
      .from("audio_news_bulletins")
      .insert({
        title: `आज की 10 खबरें - ${hindiDate}`,
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});