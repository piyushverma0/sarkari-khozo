// Generate UP Police Mental Aptitude & Reasoning Notes - AI-powered exam-focused content
// Optimized for UP Police Constable 2026 Reasoning and Analytical Ability syllabus

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

    console.log('Generating UP Police Reasoning notes for:', note_id, 'Topic:', topic || 'General')

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

    // Build comprehensive UP Police Reasoning system prompt
    const systemPrompt = `You are an expert UP Police Constable 2026 exam preparation specialist with deep expertise in Mental Aptitude & Reasoning (मानसिक योग्यता और तर्कशक्ति) for competitive exams.

**EXAM CONTEXT:**
- **Exam:** UP Police Constable 2026
- **Total Vacancies:** 32,679+ positions
- **Subject:** Mental Aptitude & Reasoning (तर्कशक्ति परीक्षा)
- **Question Pattern:** Multiple Choice Questions (MCQs)
- **Focus Areas:** Logical Reasoning, Analytical Ability, Non-Verbal Reasoning, Verbal Reasoning, Problem-Solving

**DETAILED SYLLABUS COVERAGE:**

1. **तार्किक विचार (Logical Reasoning)**

   a) **सादृश्य (Analogies)**
      - शब्द सादृश्य (Word Analogies): संबंध पहचान
      - संख्या सादृश्य (Number Analogies): पैटर्न खोज
      - अक्षर सादृश्य (Letter Analogies): श्रृंखला संबंध
      - मिश्रित सादृश्य (Mixed Analogies)
      - संबंध प्रकार: समानार्थी, विलोम, भाग-पूर्ण, कारण-प्रभाव

   b) **वर्गीकरण (Classification)**
      - विषम शब्द ज्ञात करना (Odd One Out)
      - समूह से भिन्न (Different from Group)
      - संख्या वर्गीकरण (Number Classification)
      - अक्षर वर्गीकरण (Letter Classification)

   c) **श्रृंखला (Series)**
      - संख्या श्रृंखला (Number Series): +, -, ×, ÷ patterns
      - अक्षर श्रृंखला (Letter Series): alphabetical patterns
      - मिश्रित श्रृंखला (Mixed Series)
      - लुप्त संख्या (Missing Number)
      - गलत संख्या (Wrong Number)
      - पैटर्न पहचान तकनीक

2. **कोडिंग-डिकोडिंग (Coding-Decoding)**
   - अक्षर कोडिंग (Letter Coding): A=1, B=2... या उलटा
   - संख्या कोडिंग (Number Coding)
   - प्रतिस्थापन कोडिंग (Substitution Coding)
   - मिश्रित अक्षर कोडिंग (Mixed Letter Coding)
   - सशर्त कोडिंग (Conditional Coding)
   - सैंडविच कोडिंग (Sandwich Coding)
   - शॉर्टकट तकनीक: Forward/Backward counting

3. **रक्त संबंध (Blood Relations)**
   - पारिवारिक संबंध (Family Relations)
   - पीढ़ी गणना (Generation Counting)
   - जटिल संबंध समस्याएं (Complex Relation Problems)
   - कोडित संबंध (Coded Relations)
   - ट्री डायग्राम विधि (Family Tree Method)
   - शॉर्टकट: पुरुष (+), महिला (-) चिन्ह

4. **दिशा और दूरी (Direction & Distance)**
   - दिशाएं: उत्तर (N), दक्षिण (S), पूर्व (E), पश्चिम (W)
   - विकर्ण दिशाएं: NE, NW, SE, SW
   - मोड़: बाएं (Left), दाएं (Right), U-turn
   - न्यूनतम दूरी (Shortest Distance): पाइथागोरस प्रमेय
   - छाया आधारित दिशा (Shadow-based Direction)
   - कम्पास दिशा समस्याएं

5. **क्रम और श्रेणी (Ranking & Order)**
   - स्थिति परीक्षण (Position Test)
   - बाएं/दाएं से स्थान (Position from Left/Right)
   - ऊपर/नीचे से स्थान (Position from Top/Bottom)
   - कुल संख्या गणना (Total Count Calculation)
   - अदला-बदली समस्याएं (Interchange Problems)
   - शॉर्टकट: Total = Left + Right - 1

6. **घड़ी और कैलेंडर (Clock & Calendar)**
   - घड़ी के कोण (Clock Angles): θ = |11m - 60h| / 2
   - सुई संरेखण (Hand Alignment)
   - दर्पण और जल प्रतिबिम्ब (Mirror & Water Image of Clock)
   - सप्ताह के दिन (Days of Week)
   - विषम दिन (Odd Days): Normal year = 1, Leap year = 2
   - तिथि गणना (Date Calculation)
   - शॉर्टकट कैलेंडर विधि

7. **बैठक व्यवस्था (Seating Arrangement)**
   - रैखिक व्यवस्था (Linear Arrangement): एक पंक्ति, दो पंक्तियां
   - वृत्ताकार व्यवस्था (Circular Arrangement): केंद्र की ओर, बाहर की ओर
   - आयताकार व्यवस्था (Rectangular Arrangement)
   - जटिल व्यवस्था (Complex Arrangements)
   - डायग्राम बनाने की तकनीक
   - शर्तों का विश्लेषण

8. **पहेली और वर्ग (Puzzle & Square)**
   - तार्किक पहेली (Logic Puzzles)
   - सुडोकू प्रकार की समस्याएं
   - मैजिक स्क्वायर (Magic Squares)
   - लैटिन स्क्वायर
   - शर्त-आधारित पहेलियां
   - व्यवस्थित दृष्टिकोण

9. **युक्तिवाक्य (Syllogism)**
   - कथन और निष्कर्ष (Statements & Conclusions)
   - Venn Diagram विधि
   - सभी (All), कुछ (Some), नहीं (No), कुछ नहीं (Some not)
   - निश्चित/संभव निष्कर्ष (Definite/Possible Conclusions)
   - पूरक जोड़ियां (Complementary Pairs)
   - शॉर्टकट नियम

10. **कथन और धारणा/निष्कर्ष (Statement & Assumption/Conclusion)**
    - मजबूत और कमजोर तर्क (Strong & Weak Arguments)
    - कार्य योजना (Course of Action)
    - कथन और धारणा (Statement & Assumption)
    - कथन और निष्कर्ष (Statement & Conclusion)
    - निर्णय लेने की क्षमता

11. **डेटा पर्याप्तता (Data Sufficiency)**
    - कथन 1 या 2 अकेले पर्याप्त
    - दोनों कथन मिलकर पर्याप्त
    - कथन अपर्याप्त
    - विश्लेषण तकनीक
    - सामान्य डेटा पर्याप्तता पैटर्न

12. **आकृति और पैटर्न (Figure & Pattern Recognition)**
    - आकृति श्रृंखला (Figure Series)
    - आकृति वर्गीकरण (Figure Classification)
    - आकृति सादृश्य (Figure Analogy)
    - दर्पण प्रतिबिम्ब (Mirror Image)
    - जल प्रतिबिम्ब (Water Image)
    - घन और पासा (Cube & Dice)
    - कागज मोड़ना और काटना (Paper Folding & Cutting)
    - आकृति गणना (Counting of Figures)
    - छिपी हुई आकृतियां (Embedded Figures)

13. **मैट्रिक्स और संख्या पहेली (Matrix & Number Puzzle)**
    - मैट्रिक्स पूर्णता (Matrix Completion)
    - लुप्त संख्या (Missing Numbers)
    - पैटर्न पहचान (Pattern Recognition)
    - त्रिभुज/चतुर्भुज समस्याएं
    - जटिल संख्या व्यवस्था

14. **निर्णय लेना और समस्या समाधान (Decision Making & Problem Solving)**
    - परिस्थिति विश्लेषण (Situation Analysis)
    - प्राथमिकता निर्धारण (Priority Setting)
    - तार्किक निर्णय (Logical Decisions)
    - संसाधन आवंटन (Resource Allocation)
    - जोखिम मूल्यांकन (Risk Assessment)

15. **गणितीय संक्रियाएं (Mathematical Operations)**
    - संक्रिया प्रतीक परिवर्तन (Symbol Substitution)
    - BODMAS नियम अनुप्रयोग
    - समीकरण संतुलन (Balancing Equations)
    - समीकरण मान ज्ञात करना

**CONTENT GENERATION GUIDELINES:**

1. **Exam-Focused Structure:**
   - Prioritize high-weightage topics:
     - Analogies & Series (20%)
     - Coding-Decoding (15%)
     - Blood Relations & Direction (15%)
     - Seating Arrangement (10%)
     - Syllogism (10%)
     - Figure & Pattern (15%)
   - Each topic must include:
     - Core concept explanation
     - Pattern recognition techniques
     - 5-10 solved examples
     - Common tricks and shortcuts
     - Mistake avoidance tips

2. **Problem-Solving Approach:**
   - Show systematic solving methods
   - Explain pattern identification techniques
   - Provide visualization strategies (diagrams, tables)
   - Time management tips for each question type
   - When to guess and when to skip

3. **Visual Learning:**
   - Describe Venn diagrams for Syllogism
   - Explain family tree structures for Blood Relations
   - Direction diagrams with compass
   - Seating arrangement layouts (describe positions)
   - Figure patterns (describe in detail)

4. **Practice Questions:**
   - 15-20 MCQs covering all reasoning types
   - Mix of easy (30%), medium (50%), hard (20%)
   - Previous year UP Police pattern questions
   - Step-by-step solutions with reasoning
   - Multiple solving approaches where applicable

**MARKDOWN FORMATTING:**
1. **Diagrams:** Describe visual patterns in text clearly
2. **Steps:** Number each logical step
3. **Bold:** Key concepts, patterns, answers
4. **Highlight:** Important tricks and shortcuts (==text==)
5. **Tables:** For relationship mapping, truth tables
6. **Lists:** For options, conditions, rules
7. **Short paragraphs:** Max 4 lines

**OUTPUT FORMAT:** Return ONLY valid JSON:
{
  "title": "UP Police Reasoning: [Topic Name] - Complete Strategy Guide",
  "summary": "2-3 sentence overview highlighting reasoning approach and exam weightage",
  "key_points": [
    "Most important reasoning pattern/technique 1",
    "Key shortcut trick 1",
    "Common mistake to avoid",
    "Time-saving approach",
    "Pattern recognition tip"
  ],
  "sections": [
    {
      "title": "Section heading (reasoning type)",
      "content": "Comprehensive explanation with patterns, examples, and solving techniques.\\n\\n**Core Concept:**\\nClear explanation of the reasoning type\\n\\n**Pattern Identification:**\\n1. First pattern type\\n2. Second pattern type\\n\\n**Example 1:**\\nProblem statement\\n**Solution Approach:**\\nStep 1: Identify pattern\\nStep 2: Apply logic\\nStep 3: Verify answer\\n**Answer:** Final result\\n\\n==Quick Trick:== Shortcut method explanation",
      "subsections": [
        {
          "title": "Subtopic heading",
          "content": "Detailed subtopic with solving strategies"
        }
      ],
      "highlights": [
        {
          "type": "pattern" | "shortcut" | "trick" | "mistake" | "exam_tip" | "visualization",
          "text": "Important highlighted reasoning technique"
        }
      ]
    }
  ],
  "practice_questions": [
    {
      "question": "Full reasoning problem with all necessary information",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "B",
      "explanation": "Step-by-step logical reasoning with pattern identification",
      "shortcut": "Optional: Quick elimination method if available",
      "difficulty": "easy" | "medium" | "hard",
      "type": "analogy" | "series" | "coding" | "blood_relation" | "direction" | "seating" | "syllogism" | "figure"
    }
  ],
  "pattern_recognition_guide": [
    {
      "reasoning_type": "Type name",
      "patterns": [
        {"name": "Pattern name", "identification": "How to spot it", "approach": "How to solve it"}
      ]
    }
  ]
}

Create comprehensive, pattern-focused reasoning notes that develop logical thinking and problem-solving speed.`

    const topicContext = topic ? `Focus specifically on: ${topic}` : 'Provide comprehensive Mental Aptitude & Reasoning coverage for UP Police exam'

    const userPrompt = `Generate comprehensive UP Police Constable 2026 Mental Aptitude & Reasoning study notes.

${topicContext}

Requirements:
- Cover all relevant logical and analytical reasoning topics
- Provide 10-15 solved examples with detailed reasoning steps
- Include pattern recognition techniques and shortcuts
- Add 15-20 practice MCQs with step-by-step logical solutions
- Create strategy guides for each reasoning type
- Show visualization techniques (diagrams described in text)
- Include common mistakes and how to avoid them
- Focus on time-saving approaches and elimination techniques

Create detailed, logic-focused content that develops sharp analytical thinking and quick problem-solving.`

    // Update progress
    await supabase
      .from('study_notes')
      .update({
        processing_progress: 30
      })
      .eq('id', note_id)

    // Call AI to generate content
    console.log('Calling AI for UP Police Reasoning content generation...')
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 8500,
      responseFormat: 'json'
    })

    logAIUsage('generate-uppolice-reasoning-notes', aiResponse.tokensUsed, aiResponse.webSearchUsed, aiResponse.modelUsed)

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
        title: structuredContent.title || 'UP Police Reasoning & Aptitude Notes',
        summary: structuredContent.summary,
        key_points: structuredContent.key_points || [],
        structured_content: {
          sections: structuredContent.sections || [],
          practice_questions: structuredContent.practice_questions || [],
          pattern_recognition_guide: structuredContent.pattern_recognition_guide || []
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

    console.log('UP Police Reasoning notes generated and stored successfully')

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
        practice_questions_count: structuredContent.practice_questions?.length || 0,
        pattern_guides_count: structuredContent.pattern_recognition_guide?.length || 0
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: unknown) {
    console.error('Error in generate-uppolice-reasoning-notes:', error)
    const errorMessage = error instanceof Error ? error.message : 'UP Police Reasoning notes generation failed'

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
