-- Migration: Convert Teach Me to True Socratic Teaching
-- Changes fixed steps to dynamic concepts with conversation turns

-- Add new columns for Socratic teaching
ALTER TABLE public.teach_me_sessions
  -- Replace steps with concepts (keep both temporarily for migration)
  ADD COLUMN IF NOT EXISTS concepts JSONB DEFAULT '[]'::jsonb,
  -- Current concept tracking (replaces current_step)
  ADD COLUMN IF NOT EXISTS current_concept_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_concepts INTEGER DEFAULT 9,
  ADD COLUMN IF NOT EXISTS concepts_mastered INTEGER DEFAULT 0,
  -- Current conversation turns for active concept
  ADD COLUMN IF NOT EXISTS current_conversation JSONB DEFAULT '[]'::jsonb,
  -- Adaptive learning state
  ADD COLUMN IF NOT EXISTS student_understanding_level TEXT DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS concepts_to_revisit TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS concepts_skipped TEXT[] DEFAULT '{}',
  -- Enhanced misconception tracking (replaces simple arrays)
  ADD COLUMN IF NOT EXISTS misconceptions JSONB DEFAULT '[]'::jsonb,
  -- Session metadata
  ADD COLUMN IF NOT EXISTS total_conversation_turns INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_turns_per_concept DECIMAL(4,2) DEFAULT 0,
  -- Mode flag (to support both old and new systems during transition)
  ADD COLUMN IF NOT EXISTS teaching_mode TEXT DEFAULT 'socratic';

-- Create index for concept queries
CREATE INDEX IF NOT EXISTS idx_teach_me_sessions_concept_index
  ON public.teach_me_sessions(current_concept_index);

CREATE INDEX IF NOT EXISTS idx_teach_me_sessions_understanding_level
  ON public.teach_me_sessions(student_understanding_level);

-- Add comments for documentation
COMMENT ON COLUMN teach_me_sessions.concepts IS
  'Array of concept objects with conversation history. Each concept represents a learning goal with multi-turn dialogue.';

COMMENT ON COLUMN teach_me_sessions.current_conversation IS
  'Active conversation turns for current concept. Cleared when concept is mastered.';

COMMENT ON COLUMN teach_me_sessions.student_understanding_level IS
  'Dynamic assessment of student level: beginner, intermediate, or advanced. Updated based on performance.';

COMMENT ON COLUMN teach_me_sessions.misconceptions IS
  'Array of identified misconceptions with context: {concept, misconception, identified_at, resolved}';

COMMENT ON COLUMN teach_me_sessions.teaching_mode IS
  'Teaching mode: fixed_steps (legacy 6-step quiz) or socratic (dynamic dialogue). Allows gradual migration.';

-- Function to migrate old sessions to new format
CREATE OR REPLACE FUNCTION migrate_session_to_socratic(session_id UUID)
RETURNS void AS $$
DECLARE
  old_steps JSONB;
  new_concepts JSONB;
  step_record RECORD;
  concept_num INTEGER := 0;
BEGIN
  -- Get old steps
  SELECT steps INTO old_steps
  FROM teach_me_sessions
  WHERE id = session_id;

  -- Convert steps to concepts (simple mapping)
  new_concepts := '[]'::jsonb;

  FOR step_record IN
    SELECT * FROM jsonb_array_elements(old_steps) AS step
  LOOP
    concept_num := concept_num + 1;

    -- Create concept from step
    new_concepts := new_concepts || jsonb_build_array(
      jsonb_build_object(
        'concept_number', concept_num,
        'concept_name', step_record.step->>'question_text',
        'concept_difficulty',
          CASE
            WHEN (step_record.step->>'question_type') = 'TRUE_FALSE' THEN 'easy'
            WHEN (step_record.step->>'question_type') = 'MCQ' THEN 'medium'
            ELSE 'hard'
          END,
        'conversation_turns', jsonb_build_array(
          jsonb_build_object(
            'turn_number', 1,
            'speaker', 'AI',
            'message', step_record.step->>'question_text',
            'type', 'OPENING_QUESTION',
            'timestamp', now()
          ),
          CASE
            WHEN step_record.step->>'user_answer' IS NOT NULL THEN
              jsonb_build_object(
                'turn_number', 2,
                'speaker', 'STUDENT',
                'message', step_record.step->>'user_answer',
                'type', 'ANSWER',
                'timestamp', now()
              )
            ELSE NULL
          END
        ),
        'is_mastered', (step_record.step->'validation_result'->>'is_correct')::boolean,
        'understanding_score', (step_record.step->'validation_result'->>'score_percentage')::integer,
        'attempts', 1,
        'misconceptions_identified', '[]'::jsonb,
        'time_spent_seconds', 60,
        'probing_questions_asked', 0
      )
    );
  END LOOP;

  -- Update session with new format
  UPDATE teach_me_sessions
  SET
    concepts = new_concepts,
    current_concept_index = current_step,
    total_concepts = 6,
    teaching_mode = 'fixed_steps'
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_session_to_socratic IS
  'Migrates a session from old fixed-steps format to new Socratic concepts format.
   Run manually: SELECT migrate_session_to_socratic(''session-uuid'');';