// Generate UP Police General Hindi Notes - AI-powered exam-focused content generation
// Optimized for UP Police Constable 2026 Hindi syllabus (व्याकरण, समझ, और साहित्य)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { callAI, logAIUsage } from '../_shared/ai-client.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateNotesRequest {
  note_id: string
  user_id: string
  topic?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { note_id, user_id, topic }: GenerateNotesRequest = await req.json()

    if (!note_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'note_id and user_id are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Generating UP Police Hindi notes for:', note_id, 'Topic:', topic || 'General')

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Update progress
    await supabase
      .from('study_notes')
      .update({
        processing_status: 'generating',
        processing_progress: 10
      })
      .eq('id', note_id)

    // Build comprehensive UP Police Hindi system prompt
    const systemPrompt = `You are an expert UP Police Constable 2026 exam preparation specialist with deep expertise in Hindi language (हिंदी भाषा) for competitive exams.

**परीक्षा संदर्भ (EXAM CONTEXT):**
- **परीक्षा:** UP Police Constable 2026
- **कुल पद:** 32,679+ positions
- **विषय:** सामान्य हिंदी (General Hindi)
- **प्रश्न प्रकार:** बहुविकल्पीय प्रश्न (MCQs)
- **फोकस क्षेत्र:** व्याकरण, शब्दावली, समझ, साहित्य, मुहावरे, लोकोक्तियाँ

**विस्तृत पाठ्यक्रम (DETAILED SYLLABUS):**

1. **हिंदी वर्णमाला और वर्तनी (Alphabet & Spelling)**
   - स्वर (Vowels): अ, आ, इ, ई, उ, ऊ, ऋ, ए, ऐ, ओ, औ, अं, अः
   - व्यंजन (Consonants): क से ज्ञ तक (35 व्यंजन)
   - संयुक्त व्यंजन: क्ष, त्र, ज्ञ, श्र
   - वर्तनी शुद्धि (Spelling Correction): सामान्य गलतियाँ और सुधार
   - शुद्ध-अशुद्ध वाक्य: वाक्य शुद्धिकरण के नियम

2. **संधि और संधि विच्छेद (Sandhi)**
   - स्वर संधि (Vowel Sandhi): दीर्घ, गुण, वृद्धि, यण, अयादि
   - व्यंजन संधि (Consonant Sandhi): परसवर्ण, अनुस्वार, विसर्ग
   - विसर्ग संधि: सकार, रेफ, उत्व
   - उदाहरण और प्रैक्टिस प्रश्न

3. **समास (Compound Words)**
   - अव्ययीभाव समास: यथाशक्ति, प्रतिदिन, आजीवन
   - तत्पुरुष समास: राजपुत्र, देशभक्ति, गृहप्रवेश
   - कर्मधारय समास: नीलकमल, महापुरुष, कृष्णसर्प
   - द्विगु समास: त्रिलोक, सप्तर्षि, नवरत्न
   - द्वंद्व समास: माता-पिता, राम-लक्ष्मण, सीता-राम
   - बहुव्रीहि समास: चक्रपाणि, दशानन, लंबोदर
   - समास विग्रह और पहचान के ट्रिक्स

4. **उपसर्ग और प्रत्यय (Prefix & Suffix)**
   - संस्कृत उपसर्ग: अति, अधि, अनु, अप, उप, दुर, दुस, नि, निर, परा, परि, प्र, वि, सम, सु
   - हिंदी उपसर्ग: अ, अन, क, कु, दुर, नि, बिन, भर
   - उर्दू उपसर्ग: कम, खुश, गैर, ना, ला, बद, बे, हम, हर
   - कृत प्रत्यय: आई, त, ता, ती, वाला, हारा, अक्कड़
   - तद्धित प्रत्यय: आई, आरा, इया, ई, एरा, पन, त्व, ता

5. **शब्द भेद (Parts of Speech)**
   - संज्ञा (Noun): व्यक्तिवाचक, जातिवाचक, भाववाचक, समूहवाचक, द्रव्यवाचक
   - सर्वनाम (Pronoun): पुरुषवाचक, निश्चयवाचक, अनिश्चयवाचक, संबंधवाचक, प्रश्नवाचक, निजवाचक
   - विशेषण (Adjective): गुणवाचक, संख्यावाचक, परिमाणवाचक, सार्वनामिक
   - क्रिया (Verb): सकर्मक, अकर्मक, प्रेरणार्थक, संयुक्त, नामधातु
   - क्रिया विशेषण (Adverb): कालवाचक, स्थानवाचक, रीतिवाचक, परिमाणवाचक
   - संबंधबोधक (Postposition): के लिए, की ओर, के सामने, के बिना, के साथ
   - समुच्चयबोधक (Conjunction): और, या, परंतु, किंतु, लेकिन, इसलिए, क्योंकि
   - विस्मयादिबोधक (Interjection): अहा, वाह, हाय, छि, ओह, अरे

6. **काल और वाच्य (Tense & Voice)**
   - वर्तमान काल: सामान्य, अपूर्ण, संदिग्ध, तात्कालिक, संभाव्य
   - भूतकाल: सामान्य, आसन्न, पूर्ण, अपूर्ण, संदिग्ध, हेतुहेतुमद
   - भविष्य काल: सामान्य, संभाव्य
   - वाच्य: कर्तृवाच्य, कर्मवाच्य, भाववाच्य
   - वाच्य परिवर्तन के नियम और उदाहरण

7. **पर्यायवाची और विलोम शब्द (Synonyms & Antonyms)**
   - महत्वपूर्ण शब्दों के पर्यायवाची (100+ उदाहरण)
   - प्रचलित विलोम शब्द (100+ जोड़े)
   - परीक्षा में आने वाले मुख्य शब्द
   - शब्द चयन की ट्रिक्स

8. **मुहावरे और लोकोक्तियाँ (Idioms & Proverbs)**
   - प्रचलित मुहावरे (50+): अंगारों पर पैर रखना, आँखों में धूल झोंकना, टस से मस न होना
   - लोकोक्तियाँ (50+): अब पछताए होत क्या, अधजल गगरी छलकत जाए, आम के आम गुठलियों के दाम
   - अर्थ और प्रयोग के साथ
   - वाक्यों में प्रयोग की विधि

9. **अनेक शब्दों के लिए एक शब्द (One Word Substitution)**
   - परीक्षा में पूछे जाने वाले प्रमुख उदाहरण (100+)
   - जैसे: जो देखा न जा सके = अदृश्य, जिसकी कोई उपमा न हो = अनुपम

10. **अपठित गद्यांश और पद्यांश (Comprehension)**
    - गद्यांश समझ: केंद्रीय भाव, शीर्षक, सारांश
    - पद्यांश समझ: काव्य भाव, अलंकार, रस
    - प्रश्नों के उत्तर खोजने की तकनीक

11. **हिंदी साहित्य का इतिहास (Hindi Literature)**
    - आदिकाल, भक्तिकाल, रीतिकाल, आधुनिक काल
    - प्रमुख कवि और लेखक: कबीर, तुलसीदास, सूरदास, प्रेमचंद, महादेवी वर्मा, जयशंकर प्रसाद
    - प्रमुख रचनाएं और उनके रचयिता

**सामग्री निर्माण दिशानिर्देश (CONTENT GENERATION GUIDELINES):**

1. **परीक्षा-केंद्रित संरचना:**
   - UP Police परीक्षा में अधिक पूछे जाने वाले विषयों से शुरुआत करें
   - प्रत्येक व्याकरण नियम के साथ 5-10 उदाहरण दें
   - सामान्य गलतियों और उनके सुधार पर ध्यान दें
   - त्वरित संशोधन बिंदुओं को शामिल करें

2. **जानकारी की गहराई:**
   - प्रत्येक टॉपिक की संपूर्ण व्याख्या देवनागरी लिपि में
   - स्मरण तकनीक (Mnemonics) हिंदी में प्रदान करें
   - तुलना तालिकाएं (जैसे: संधि के प्रकार)
   - शब्द सूचियां (पर्यायवाची, विलोम, मुहावरे)

3. **व्यावहारिक अभ्यास:**
   - 15-20 अभ्यास प्रश्न (MCQs) विस्तृत व्याख्या के साथ
   - विभिन्न कठिनाई स्तर: आसान (40%), मध्यम (40%), कठिन (20%)
   - पिछले वर्ष के प्रश्न पैटर्न
   - सामान्य गलतियों से बचने के टिप्स

4. **भाषा और प्रस्तुति:**
   - सभी व्याकरण नियम देवनागरी में लिखें
   - अंग्रेजी में केवल तकनीकी शब्द (जैसे: Noun, Verb)
   - सरल और स्पष्ट भाषा का उपयोग
   - उदाहरण रोज़मर्रा के वाक्यों से

**MARKDOWN FORMATTING:**
1. **शीर्षक:** ### मुख्य विषय, #### उप-विषय
2. **बोल्ड:** महत्वपूर्ण नियम, शब्द (**पाठ**)
3. **इटैलिक:** परिभाषाएं, उदाहरण (*पाठ*)
4. **कोड:** विशेष प्रतीक (\`उदाहरण\`)
5. **हाइलाइट:** परीक्षा के लिए महत्वपूर्ण (==जरूरी जानकारी==)
6. **सूचियां:** बुलेट पॉइंट्स का उपयोग
7. **तालिका:** तुलना के लिए markdown tables
8. **छोटे पैराग्राफ:** अधिकतम 4 पंक्तियां

**OUTPUT FORMAT:** Return ONLY valid JSON:
{
  "title": "UP Police हिंदी: [विषय नाम] - परीक्षा तैयारी नोट्स",
  "summary": "2-3 वाक्यों में मुख्य परीक्षा फोकस क्षेत्रों का विवरण",
  "key_points": [
    "सबसे महत्वपूर्ण परीक्षा बिंदु 1 (विशिष्ट तथ्यों के साथ)",
    "सबसे महत्वपूर्ण परीक्षा बिंदु 2",
    "सबसे महत्वपूर्ण परीक्षा बिंदु 3",
    "सबसे महत्वपूर्ण परीक्षा बिंदु 4",
    "सबसे महत्वपूर्ण परीक्षा बिंदु 5"
  ],
  "sections": [
    {
      "title": "खंड शीर्षक (परीक्षा-प्रासंगिक)",
      "content": "विस्तृत सामग्री markdown formatting के साथ। **बोल्ड** महत्वपूर्ण शब्दों के लिए, \`कोड\` उदाहरणों के लिए, ==हाइलाइट== महत्वपूर्ण बिंदुओं के लिए।\\n\\n**उदाहरण प्रारूप:**\\n- पहला मुख्य बिंदु विवरण के साथ\\n- दूसरा मुख्य बिंदु\\n\\nअवधारणाओं की व्याख्या करने वाला छोटा पैराग्राफ।",
      "subsections": [
        {
          "title": "उप-विषय शीर्षक",
          "content": "विस्तृत उप-विषय सामग्री समान formatting नियमों के साथ"
        }
      ],
      "highlights": [
        {
          "type": "exam_tip" | "important_rule" | "mnemonic" | "common_mistake",
          "text": "परीक्षा के लिए महत्वपूर्ण हाइलाइट की गई जानकारी"
        }
      ]
    }
  ],
  "practice_questions": [
    {
      "question": "पूर्ण MCQ प्रश्न हिंदी में",
      "options": ["विकल्प A", "विकल्प B", "विकल्प C", "विकल्प D"],
      "correct_answer": "B",
      "explanation": "विस्तृत व्याख्या तर्क और संबंधित तथ्यों के साथ"
    }
  ]
}

याद रखें: विस्तृत, परीक्षा-केंद्रित नोट्स बनाएं जो छात्रों को UP Police Constable 2026 हिंदी अनुभाग में सफल होने में मदद करें।`

    const topicContext = topic ? `विशेष रूप से इस पर ध्यान दें: ${topic}` : 'UP Police परीक्षा के लिए व्यापक हिंदी व्याकरण कवरेज प्रदान करें'

    const userPrompt = `UP Police Constable 2026 सामान्य हिंदी के लिए विस्तृत अध्ययन नोट्स तैयार करें।

${topicContext}

आवश्यकताएं:
- UP Police परीक्षा के लिए सभी प्रासंगिक हिंदी व्याकरण विषयों को कवर करें
- प्रत्येक नियम के साथ 5-10 उदाहरण शामिल करें
- 50+ मुहावरे और लोकोक्तियां अर्थ के साथ
- 100+ पर्यायवाची और विलोम शब्द
- 15-20 अभ्यास MCQs विस्तृत व्याख्या के साथ
- स्मरण तकनीक और याद रखने की ट्रिक्स
- सामान्य गलतियों से बचने के टिप्स
- त्वरित संशोधन बिंदु

विस्तृत, परीक्षा-केंद्रित सामग्री बनाएं जो छात्रों की UP Police हिंदी अनुभाग में सफलता को अधिकतम करे।`

    // Update progress
    await supabase
      .from('study_notes')
      .update({
        processing_progress: 30
      })
      .eq('id', note_id)

    // Call AI to generate content
    console.log('Calling AI for UP Police Hindi content generation...')
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 8500,
      responseFormat: 'json'
    })

    logAIUsage('generate-uppolice-hindi-notes', aiResponse.tokensUsed, aiResponse.webSearchUsed, aiResponse.modelUsed)

    console.log('AI generation complete with', aiResponse.modelUsed)

    // Update progress
    await supabase
      .from('study_notes')
      .update({
        processing_progress: 70
      })
      .eq('id', note_id)

    // Parse AI response
    let responseText = aiResponse.content
    let cleanedJson = responseText.trim()

    // Remove markdown code blocks if present
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    let structuredContent
    try {
      structuredContent = JSON.parse(cleanedJson)
    } catch (parseError: unknown) {
      console.error('Failed to parse JSON:', parseError)
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error'
      throw new Error(`Failed to parse generated content: ${errorMessage}`)
    }

    // Update progress
    await supabase
      .from('study_notes')
      .update({
        processing_progress: 90
      })
      .eq('id', note_id)

    // Store in database
    const { error: updateError } = await supabase
      .from('study_notes')
      .update({
        title: structuredContent.title || 'UP Police हिंदी नोट्स',
        summary: structuredContent.summary,
        key_points: structuredContent.key_points || [],
        structured_content: {
          sections: structuredContent.sections || [],
          practice_questions: structuredContent.practice_questions || []
        },
        raw_content: JSON.stringify(structuredContent),
        processing_status: 'completed',
        processing_progress: 100,
        processing_error: null,
        user_id: user_id
      })
      .eq('id', note_id)

    if (updateError) {
      console.error('Failed to update note:', updateError)
      throw updateError
    }

    console.log('UP Police Hindi notes generated and stored successfully')

    // Trigger recall questions generation asynchronously
    try {
      fetch(`${SUPABASE_URL}/functions/v1/generate-recall-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          note_id,
          structured_content: { sections: structuredContent.sections || [] },
          max_questions_per_section: 3
        })
      }).catch(err => console.error('Failed to trigger recall questions:', err))
    } catch (e) {
      console.error('Error triggering recall questions:', e)
    }

    return new Response(
      JSON.stringify({
        success: true,
        note_id,
        title: structuredContent.title,
        sections_count: structuredContent.sections?.length || 0,
        practice_questions_count: structuredContent.practice_questions?.length || 0
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: unknown) {
    console.error('Error in generate-uppolice-hindi-notes:', error)
    const errorMessage = error instanceof Error ? error.message : 'UP Police Hindi notes generation failed'

    // Update note status to failed
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      // We can't re-read the body after it's been consumed, so we skip updating on error
    } catch (e) {
      console.error('Failed to update error status:', e)
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
