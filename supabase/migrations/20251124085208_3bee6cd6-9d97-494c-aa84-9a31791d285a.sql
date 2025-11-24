-- Drop existing note_collaborators table if it exists (since we're redesigning it)
DROP TABLE IF EXISTS note_collaborators CASCADE;

-- Create note_collaborators with new structure
CREATE TABLE note_collaborators (
    note_id UUID REFERENCES study_notes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    permission TEXT NOT NULL CHECK (permission IN ('view', 'edit', 'owner')),
    added_by UUID REFERENCES auth.users(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (note_id, user_id)
);

-- Create collaboration invites table
CREATE TABLE collaboration_invites (
    invite_code UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID REFERENCES study_notes(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
    expires_at TIMESTAMPTZ NOT NULL,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create collaborator presence table
CREATE TABLE collaborator_presence (
    note_id UUID REFERENCES study_notes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (note_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE note_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborator_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note_collaborators
CREATE POLICY "Users can view their collaborations"
ON note_collaborators FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = added_by);

CREATE POLICY "Note owners can add collaborators"
ON note_collaborators FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM study_notes 
        WHERE id = note_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Owners can update collaborator permissions"
ON note_collaborators FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM study_notes 
        WHERE id = note_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Owners can remove collaborators"
ON note_collaborators FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM study_notes 
        WHERE id = note_id AND user_id = auth.uid()
    )
);

-- RLS Policies for collaboration_invites
CREATE POLICY "Users can view invites they created"
ON collaboration_invites FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Note owners can create invites"
ON collaboration_invites FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM study_notes 
        WHERE id = note_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Anyone can view active invites"
ON collaboration_invites FOR SELECT
USING (expires_at > NOW() AND (max_uses IS NULL OR used_count < max_uses));

CREATE POLICY "Creators can delete their invites"
ON collaboration_invites FOR DELETE
USING (auth.uid() = created_by);

-- RLS Policies for collaborator_presence
CREATE POLICY "Collaborators can view presence in their notes"
ON collaborator_presence FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM note_collaborators 
        WHERE note_id = collaborator_presence.note_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Collaborators can update their own presence"
ON collaborator_presence FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Collaborators can update their presence"
ON collaborator_presence FOR UPDATE
USING (auth.uid() = user_id);