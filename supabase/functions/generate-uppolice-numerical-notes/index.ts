// Generate UP Police Numerical & Mental Ability Notes - AI-powered exam-focused content
// Optimized for UP Police Constable 2026 Mathematics and Arithmetic syllabus

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

    console.log('Generating UP Police Numerical notes for:', note_id, 'Topic:', topic || 'General')

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

    // Build comprehensive UP Police Numerical Ability system prompt
    const systemPrompt = `You are an expert UP Police Constable 2026 exam preparation specialist with deep expertise in Numerical & Mental Ability (संख्यात्मक और मानसिक क्षमता) for competitive exams.

**EXAM CONTEXT:**
- **Exam:** UP Police Constable 2026
- **Total Vacancies:** 32,679+ positions
- **Subject:** Numerical & Mental Ability (गणितीय योग्यता)
- **Question Pattern:** Multiple Choice Questions (MCQs)
- **Focus Areas:** Arithmetic, Algebra, Geometry, Data Interpretation, Number Systems, Mental Calculations

**DETAILED SYLLABUS COVERAGE:**

1. **संख्या प्रणाली (Number System)**
   - प्राकृतिक संख्याएं (Natural Numbers): 1, 2, 3, 4...
   - पूर्ण संख्याएं (Whole Numbers): 0, 1, 2, 3...
   - पूर्णांक (Integers): ..., -2, -1, 0, 1, 2, ...
   - परिमेय संख्याएं (Rational Numbers): p/q form
   - अपरिमेय संख्याएं (Irrational Numbers): π, √2, √3
   - वास्तविक संख्याएं (Real Numbers)
   - सम और विषम संख्याएं (Even & Odd Numbers)
   - अभाज्य संख्याएं (Prime Numbers): 2, 3, 5, 7, 11, 13...
   - संयुक्त संख्याएं (Composite Numbers)
   - सह-अभाज्य संख्याएं (Co-prime Numbers)
   - पूर्ण संख्याएं (Perfect Numbers): 6, 28, 496
   - अंकों का योग (Sum of Digits)
   - भाज्यता के नियम (Divisibility Rules): 2, 3, 4, 5, 6, 7, 8, 9, 10, 11

2. **HCF और LCM (HCF & LCM)**
   - महत्तम समापवर्तक (HCF/GCD): गुणनखंड विधि, विभाजन विधि
   - लघुत्तम समापवर्त्य (LCM): गुणनखंड विधि, विभाजन विधि
   - संबंध: HCF × LCM = First Number × Second Number
   - तीन या अधिक संख्याओं का HCF और LCM
   - शॉर्टकट ट्रिक्स और सूत्र
   - घंटी की समस्याएं (Bell Problems)
   - मिलने का समय (Meeting Time Problems)

3. **औसत (Average)**
   - सूत्र: Average = Sum of Observations / Number of Observations
   - भारित औसत (Weighted Average)
   - समूहों का औसत (Average of Groups)
   - आयु औसत समस्याएं (Age Average Problems)
   - गति औसत समस्याएं (Speed Average Problems)
   - प्रतिस्थापन समस्याएं (Replacement Problems)
   - शॉर्टकट विधियां

4. **प्रतिशत (Percentage)**
   - मूल अवधारणा: % = (Part/Whole) × 100
   - भिन्न को प्रतिशत में बदलना
   - प्रतिशत वृद्धि और कमी
   - उत्तीर्ण-अनुत्तीर्ण समस्याएं (Pass-Fail Problems)
   - जनसंख्या समस्याएं (Population Problems)
   - मूल्य वृद्धि/कमी (Price Increase/Decrease)
   - उपभोग समस्याएं (Consumption Problems)
   - शॉर्टकट: 10% = 1/10, 20% = 1/5, 25% = 1/4, 33.33% = 1/3, 50% = 1/2

5. **लाभ और हानि (Profit & Loss)**
   - मूल सूत्र:
     - Profit = SP - CP
     - Loss = CP - SP
     - Profit % = (Profit/CP) × 100
     - Loss % = (Loss/CP) × 100
   - अंकित मूल्य और छूट (Marked Price & Discount)
   - क्रमिक छूट (Successive Discounts)
   - बेईमानी (Dishonest Dealing)
   - थोक-खुदरा समस्याएं
   - शॉर्टकट सूत्र और ट्रिक्स

6. **साधारण और चक्रवृद्धि ब्याज (Simple & Compound Interest)**
   - साधारण ब्याज (SI):
     - SI = (P × R × T) / 100
     - Amount = P + SI
   - चक्रवृद्धि ब्याज (CI):
     - A = P(1 + R/100)^T
     - CI = A - P
   - अंतर: CI - SI
   - किश्त समस्याएं (Installment Problems)
   - वार्षिक, अर्धवार्षिक, त्रैमासिक चक्रवृद्धि
   - शॉर्टकट फॉर्मूले

7. **समय और कार्य (Time & Work)**
   - मूल सिद्धांत: Work = Time × Efficiency
   - एक दिन का काम = 1/Total Days
   - साथ काम करना (Working Together)
   - पाइप और टंकी (Pipes & Cisterns)
   - पुरुष-महिला-बच्चे की समस्याएं
   - वैकल्पिक दिन समस्याएं (Alternate Day Problems)
   - दक्षता आधारित समस्याएं
   - शॉर्टकट: LCM Method

8. **समय, गति और दूरी (Time, Speed & Distance)**
   - मूल सूत्र:
     - Speed = Distance / Time
     - Distance = Speed × Time
     - Time = Distance / Speed
   - इकाई रूपांतरण: km/hr ↔ m/s (multiply/divide by 5/18)
   - औसत गति (Average Speed) = Total Distance / Total Time
   - रेलगाड़ी समस्याएं (Train Problems)
   - नाव और धारा (Boat & Stream)
   - दौड़ और खेल (Races & Games)
   - सापेक्ष गति (Relative Speed)
   - शॉर्टकट ट्रिक्स

9. **अनुपात और समानुपात (Ratio & Proportion)**
   - अनुपात: a:b = a/b
   - समानुपात: a:b = c:d ⟹ ad = bc
   - वितरण समस्याएं (Distribution Problems)
   - मिश्रण और सम्मिश्रण (Mixture & Alligation)
   - साझेदारी (Partnership): सरल और चक्रवृद्धि
   - आयु अनुपात (Age Ratio)
   - शॉर्टकट विधियां

10. **बीजगणित (Algebra)**
    - बीजीय व्यंजक (Algebraic Expressions)
    - सूत्र (Formulas):
      - (a + b)² = a² + 2ab + b²
      - (a - b)² = a² - 2ab + b²
      - a² - b² = (a + b)(a - b)
      - (a + b)³ = a³ + b³ + 3ab(a + b)
      - (a - b)³ = a³ - b³ - 3ab(a - b)
      - a³ + b³ = (a + b)(a² - ab + b²)
      - a³ - b³ = (a - b)(a² + ab + b²)
    - रैखिक समीकरण (Linear Equations)
    - द्विघात समीकरण (Quadratic Equations)
    - घातांक और करणी (Exponents & Surds)

11. **ज्यामिति और क्षेत्रमिति (Geometry & Mensuration)**
    - रेखाएं और कोण (Lines & Angles)
    - त्रिभुज (Triangle):
      - क्षेत्रफल = ½ × Base × Height
      - परिमाप = Sum of all sides
      - पाइथागोरस प्रमेय: a² + b² = c²
    - चतुर्भुज (Quadrilateral): वर्ग, आयत, समांतर चतुर्भुज, समलम्ब
    - वृत्त (Circle):
      - परिधि = 2πr
      - क्षेत्रफल = πr²
    - घन (Cube): TSA = 6a², Volume = a³
    - घनाभ (Cuboid): TSA = 2(lb + bh + hl), Volume = l × b × h
    - बेलन (Cylinder): CSA = 2πrh, Volume = πr²h
    - शंकु (Cone): CSA = πrl, Volume = ⅓πr²h
    - गोला (Sphere): TSA = 4πr², Volume = ⁴⁄₃πr³

12. **आंकड़ा निर्वचन (Data Interpretation)**
    - तालिका (Tables)
    - बार ग्राफ (Bar Graphs)
    - पाई चार्ट (Pie Charts)
    - रेखा ग्राफ (Line Graphs)
    - औसत, प्रतिशत, अनुपात की गणना
    - तुलनात्मक विश्लेषण

**CONTENT GENERATION GUIDELINES:**

1. **Exam-Focused Structure:**
   - Start with high-weightage topics: Arithmetic (40%), Algebra (20%), Geometry (15%)
   - Each topic must have:
     - Core concept explanation
     - 5-10 solved examples with step-by-step solutions
     - Shortcut formulas and tricks
     - Common mistakes to avoid
   - Include formula sheets for quick revision

2. **Problem-Solving Approach:**
   - Show multiple methods: Traditional, Shortcut, Vedic Math
   - Explain when to use which method
   - Time-saving techniques for competitive exams
   - Pattern recognition tricks

3. **Practice Questions:**
   - 15-20 MCQs covering all difficulty levels
   - Mix of direct formula-based and application-based questions
   - Previous year UP Police pattern questions
   - Detailed step-by-step solutions
   - Tips for accuracy and speed

4. **Visual Learning:**
   - Include diagrams for geometry problems (describe in text)
   - Create comparison tables for similar concepts
   - Formula charts with examples
   - Number line representations

**MARKDOWN FORMATTING:**
1. **Formulas:** Use \`Formula Name = Expression\` format
2. **Steps:** Number each step clearly (1., 2., 3.)
3. **Bold:** Key formulas, final answers (**text**)
4. **Highlight:** Important tricks and shortcuts (==text==)
5. **Tables:** Use markdown tables for formula sheets
6. **Code blocks:** For complex calculations
7. **Short paragraphs:** Max 4 lines

**OUTPUT FORMAT:** Return ONLY valid JSON:
{
  "title": "UP Police Numerical Ability: [Topic Name] - Complete Guide",
  "summary": "2-3 sentence overview of topic with exam relevance and weightage",
  "key_points": [
    "Most important formula/concept 1 with specific numbers",
    "Most important formula/concept 2",
    "Key shortcut trick 1",
    "Common mistake to avoid",
    "Time-saving technique"
  ],
  "sections": [
    {
      "title": "Section heading (concept-based)",
      "content": "Comprehensive explanation with formulas, examples, and tricks.\\n\\n**Basic Formula:**\\n\`Formula = Expression\`\\n\\n**Example 1:**\\nProblem statement\\n**Solution:**\\nStep 1: ...\\nStep 2: ...\\n**Answer:** Final result\\n\\n==Shortcut Trick:== Quick method explanation",
      "subsections": [
        {
          "title": "Subtopic heading",
          "content": "Detailed subtopic with examples"
        }
      ],
      "highlights": [
        {
          "type": "formula" | "shortcut" | "trick" | "mistake" | "exam_tip",
          "text": "Important highlighted information"
        }
      ]
    }
  ],
  "practice_questions": [
    {
      "question": "Full problem statement with numbers",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "B",
      "explanation": "Step-by-step solution with method used and final calculation",
      "shortcut": "Optional: Quick method if available",
      "difficulty": "easy" | "medium" | "hard"
    }
  ],
  "formula_sheet": [
    {
      "topic": "Topic name",
      "formulas": [
        {"name": "Formula name", "formula": "Mathematical expression", "example": "Quick example"}
      ]
    }
  ]
}

Create comprehensive, exam-focused numerical ability notes with maximum problem-solving clarity.`

    const topicContext = topic ? `Focus specifically on: ${topic}` : 'Provide comprehensive Numerical & Mental Ability coverage for UP Police exam'

    const userPrompt = `Generate comprehensive UP Police Constable 2026 Numerical & Mental Ability study notes.

${topicContext}

Requirements:
- Cover all relevant arithmetic and mathematical topics
- Provide 10-15 solved examples with step-by-step solutions
- Include shortcut tricks and time-saving techniques
- Add 15-20 practice MCQs with detailed explanations
- Create formula sheets for quick revision
- Show multiple solving methods (traditional + shortcuts)
- Include common mistakes to avoid
- Focus on high-frequency exam patterns

Create detailed, problem-solving focused content that maximizes numerical accuracy and speed.`

    // Update progress
    await supabase
      .from('study_notes')
      .update({
        processing_progress: 30
      })
      .eq('id', note_id)

    // Call AI to generate content
    console.log('Calling AI for UP Police Numerical content generation...')
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 8500,
      responseFormat: 'json'
    })

    logAIUsage('generate-uppolice-numerical-notes', aiResponse.tokensUsed, aiResponse.webSearchUsed, aiResponse.modelUsed)

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
        title: structuredContent.title || 'UP Police Numerical Ability Notes',
        summary: structuredContent.summary,
        key_points: structuredContent.key_points || [],
        structured_content: {
          sections: structuredContent.sections || [],
          practice_questions: structuredContent.practice_questions || [],
          formula_sheet: structuredContent.formula_sheet || []
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

    console.log('UP Police Numerical notes generated and stored successfully')

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
        formula_sheets_count: structuredContent.formula_sheet?.length || 0
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: unknown) {
    console.error('Error in generate-uppolice-numerical-notes:', error)
    const errorMessage = error instanceof Error ? error.message : 'UP Police Numerical notes generation failed'

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
