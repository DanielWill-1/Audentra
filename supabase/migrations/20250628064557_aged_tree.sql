/*
  # Team Collaboration Schema

  1. New Tables
    - `teams`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text, optional)
      - `owner_id` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `team_members`
      - `id` (uuid, primary key)
      - `team_id` (uuid, references teams)
      - `user_id` (uuid, references auth.users)
      - `email` (text)
      - `name` (text)
      - `role` (text: admin, editor, viewer)
      - `status` (text: active, pending, inactive)
      - `invited_by` (uuid, references auth.users)
      - `invited_at` (timestamp)
      - `joined_at` (timestamp, optional)
      - `last_active` (timestamp, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `team_invites`
      - `id` (uuid, primary key)
      - `team_id` (uuid, references teams)
      - `email` (text)
      - `role` (text: admin, editor, viewer)
      - `invited_by` (uuid, references auth.users)
      - `message` (text, optional)
      - `status` (text: pending, accepted, declined, expired)
      - `expires_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `team_activity`
      - `id` (uuid, primary key)
      - `team_id` (uuid, references teams)
      - `user_id` (uuid, references auth.users)
      - `action_type` (text)
      - `description` (text)
      - `metadata` (jsonb, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for team-based access control
*/

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  owner_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'viewer',
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL,
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  last_active timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT team_members_role_check CHECK (role = ANY (ARRAY['admin'::text, 'editor'::text, 'viewer'::text])),
  CONSTRAINT team_members_status_check CHECK (status = ANY (ARRAY['active'::text, 'pending'::text, 'inactive'::text])),
  UNIQUE(team_id, email)
);

-- Create team_invites table
CREATE TABLE IF NOT EXISTS team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  invited_by uuid NOT NULL,
  message text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT team_invites_role_check CHECK (role = ANY (ARRAY['admin'::text, 'editor'::text, 'viewer'::text])),
  CONSTRAINT team_invites_status_check CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text]))
);

-- Create team_activity table
CREATE TABLE IF NOT EXISTS team_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_invites_team_id ON team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_invites_status ON team_invites(status);
CREATE INDEX IF NOT EXISTS idx_team_activity_team_id ON team_activity(team_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_user_id ON team_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_created_at ON team_activity(created_at DESC);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Team owners can manage their teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team members can view their teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = teams.id 
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
  );

-- RLS Policies for team_members
CREATE POLICY "Team members can view team members"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can manage team members"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
      AND tm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
      AND tm.status = 'active'
    )
  );

-- RLS Policies for team_invites
CREATE POLICY "Team admins can manage invites"
  ON team_invites
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_invites.team_id 
      AND teams.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_invites.team_id 
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
      AND tm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_invites.team_id 
      AND teams.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_invites.team_id 
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
      AND tm.status = 'active'
    )
  );

CREATE POLICY "Users can view invites sent to them"
  ON team_invites
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- RLS Policies for team_activity
CREATE POLICY "Team members can view team activity"
  ON team_activity
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_activity.team_id 
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_activity.team_id 
      AND teams.owner_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create activity"
  ON team_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.team_id = team_activity.team_id 
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = team_activity.team_id 
        AND teams.owner_id = auth.uid()
      )
    )
  );

-- Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_team_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_members_updated_at();

CREATE TRIGGER update_team_invites_updated_at
  BEFORE UPDATE ON team_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_team_invites_updated_at();