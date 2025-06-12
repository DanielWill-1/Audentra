/*
  # Create templates table for VoiceForm Pro

  1. New Tables
    - `templates`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `category` (text, required)
      - `description` (text)
      - `form_data` (jsonb, stores form structure)
      - `uploaded_file` (text, file path/url if uploaded)
      - `visibility` (text, 'visible' or 'hidden')
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `templates` table
    - Add policies for users to manage their own templates
    - Add policy for viewing visible templates from other users
*/

CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('healthcare', 'fieldwork', 'hr', 'legal', 'education', 'realestate')),
  description text,
  form_data jsonb,
  uploaded_file text,
  visibility text NOT NULL DEFAULT 'visible' CHECK (visibility IN ('visible', 'hidden')),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their own templates
CREATE POLICY "Users can manage own templates"
  ON templates
  FOR ALL
  TO authenticated
  USING (auth.uid() = created_by);

-- Policy for users to view visible templates from others
CREATE POLICY "Users can view visible templates"
  ON templates
  FOR SELECT
  TO authenticated
  USING (visibility = 'visible' OR auth.uid() = created_by);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for better query performance
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_visibility ON templates(visibility);