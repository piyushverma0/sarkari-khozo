import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MindMapNode {
  id: string;
  title: string;
  description?: string;
  level: number;
  children: MindMapNode[];
  color?: string;
  icon?: string;
  keywords: string[];
  relatedNoteSection?: string;
  isExpanded: boolean;
}

// Transform camelCase node structure to snake_case for Kotlin compatibility
function transformNodeToSnakeCase(node: any): any {
  return {
    id: node.id,
    title: node.title,
    description: node.description,
    level: node.level,
    children: (node.children || []).map((child: any) => transformNodeToSnakeCase(child)),
    color: node.color,
    icon: node.icon,
    keywords: node.keywords || [],
    related_note_section: node.relatedNoteSection,
    is_expanded: node.isExpanded !== false, // default to true
  };
}

interface MindMapData {
  rootNode: MindMapNode;
  theme: string;
  generatedAt: string;
  version: number;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { noteId } = await req.json();

    if (!noteId) {
      return new Response(JSON.stringify({ error: "Note ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating mind map for note: ${noteId}`);

    // Create service role client for all operations
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Fetch note content
    const { data: note, error: noteError } = await supabase
      .from("study_notes")
      .select("id, user_id, title, summary, key_points, structured_content, raw_content")
      .eq("id", noteId)
      .single();

    if (noteError || !note) {
      return new Response(JSON.stringify({ error: "Note not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to ANALYZING
    await supabase
      .from("study_notes")
      .update({
        mind_map_generation_status: "analyzing",
      })
      .eq("id", noteId);

    // Prepare content for AI
    let noteContent = `Title: ${note.title}\n\n`;

    if (note.summary) {
      noteContent += `Summary:\n${note.summary}\n\n`;
    }

    if (note.key_points && note.key_points.length > 0) {
      noteContent += `Key Points:\n${note.key_points.map((point: string) => `- ${point}`).join("\n")}\n\n`;
    }

    if (note.structured_content?.sections) {
      noteContent += `Content Sections:\n`;
      note.structured_content.sections.forEach((section: any) => {
        noteContent += `\n${section.title}:\n${section.content}\n`;
      });
    } else if (note.raw_content) {
      noteContent += `Content:\n${note.raw_content.substring(0, 5000)}\n`;
    }

    // Update status to EXTRACTING
    await supabase
      .from("study_notes")
      .update({
        mind_map_generation_status: "extracting",
      })
      .eq("id", noteId);

    // Call Claude API to generate mind map
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    });

    console.log("Calling Claude API to generate mind map structure...");

    const prompt = `You are a learning expert creating visual mind maps for students.

Analyze the following study notes and create a hierarchical mind map structure optimized for learning and recall.

Requirements:
- Create 1 ROOT node with the main topic
- Create 3-6 LEVEL 1 branches (main topics)
- Each LEVEL 1 branch should have 2-4 LEVEL 2 sub-branches (key concepts)
- Use simple, memorable phrases (max 5 words per node title)
- Assign relevant emojis to nodes (use single emoji characters)
- Suggest hex color codes for each branch (for visual categorization)
- Keep descriptions concise (1-2 sentences max)

Notes Content:
${noteContent}

Return ONLY a valid JSON object with this EXACT structure (no additional text):
{
  "rootNode": {
    "id": "root",
    "title": "Main Topic Title",
    "description": "Brief overview",
    "level": 0,
    "children": [
      {
        "id": "branch1",
        "title": "First Main Topic",
        "description": "What this covers",
        "level": 1,
        "color": "#FF6B6B",
        "icon": "📚",
        "keywords": ["keyword1", "keyword2"],
        "children": [
          {
            "id": "branch1_sub1",
            "title": "Subtopic 1",
            "description": "Details",
            "level": 2,
            "children": [],
            "keywords": ["key"],
            "isExpanded": true
          }
        ],
        "isExpanded": true
      }
    ],
    "keywords": [],
    "isExpanded": true
  }
}`;

    // Update status to ORGANIZING
    await supabase
      .from("study_notes")
      .update({
        mind_map_generation_status: "organizing",
      })
      .eq("id", noteId);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    console.log("Claude API response received");

    // Parse the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from AI response");
    }

    const mindMapStructure = JSON.parse(jsonMatch[0]);

    // Update status to STYLING
    await supabase
      .from("study_notes")
      .update({
        mind_map_generation_status: "styling",
      })
      .eq("id", noteId);

    // Create final mind map data
    const mindMapData: MindMapData = {
      rootNode: transformNodeToSnakeCase(mindMapStructure.rootNode),
      theme: "default",
      generatedAt: new Date().toISOString(),
      version: 1,
    };

    console.log("Mind map structure created successfully");

    // Save to database
    const { error: updateError } = await supabase
      .from("study_notes")
      .update({
        mind_map_data: mindMapData,
        has_mind_map: true,
        mind_map_generated_at: new Date().toISOString(),
        mind_map_generation_status: "completed",
      })
      .eq("id", noteId);

    if (updateError) {
      throw updateError;
    }

    console.log("Mind map saved to database");

    return new Response(
      JSON.stringify({
        success: true,
        mindMapData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error generating mind map:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate mind map";

    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
